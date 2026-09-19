# Sunday Football — Product Requirements Document

> This PRD describes the product **as it exists in the codebase today** (see
> `README.md` and `CLAUDE.md`). It is not a forward-looking spec; where the
> code's intent is ambiguous, that is called out under Open questions rather
> than resolved by guessing.

## 1. Problem

A recurring Sunday football group of roughly 35 players currently organises
itself over Messenger: someone asks who's free, counts replies by hand, and
splits players into teams on the pitch once everyone has turned up. This is
slow, error-prone (positions and ability aren't accounted for), and puts the
work of team-picking on whoever gets to the pitch first, every single week.

Sunday Football replaces that manual loop with a small web app that runs the
same weekly cycle — **signup → team generation → published teams → play** —
plus a persistent attendance record.

## 2. Users and roles

There are three roles, held per-player via `group_members.role`
(`player | scorekeeper | admin`), enumerated in `types/database.ts` and
enforced in [`lib/auth/current-user.ts`](lib/auth/current-user.ts):

| Role | How they sign in | What they can do |
| --- | --- | --- |
| **Player** | 4-digit PIN, chosen at signup (`app/actions/auth.ts`, `joinAction`) | Answer confirmed/maybe/declined for each of the next 4 Sundays; set position preferences and self-ratings; see their own team once revealed; see the attendance record and other players' public profiles; change their own name, positions, PIN |
| **Scorekeeper** | Same PIN mechanism, role granted by an admin | Everything a player can do (role is additive). The schema and `requireScorekeeper` guard exist for MVP 1.5 match-event recording, but no scorekeeper-only UI ships in MVP 1 — see §4 |
| **Admin** | Supabase Auth email + password only, via `/admin-login` (`app/(auth)/admin-login`) | Everything above, plus: create/edit Sundays and venues, open/close signup, generate and hand-edit teams, publish/hide/schedule the team reveal, manage players (roles, PIN resets, activate/deactivate/delete), view the attendance matrix, manage group settings |

**A PIN session can never become admin**, regardless of what the database
says — `getCurrentUser` explicitly downgrades an `admin` role to
`scorekeeper` unless the session came from Supabase Auth
([`lib/auth/current-user.ts:49,56-58`](lib/auth/current-user.ts:49)). Becoming
an admin requires a Supabase Auth user linked to a player row by email (a
DB trigger, `on_auth_user_created`, does the linking automatically); there is
no self-serve upgrade path from inside the app.

## 3. Scope

### MVP 1 (built, per `README.md` "What is built")

- **Player identity**: name, avatar, position preferences (up to 3, ranked),
  self-rating (1–10) per position.
- **Sign-in**: lightweight PIN for players; Supabase Auth (email/password,
  with reset flow) for admins.
- **Sunday sessions**: date, venue (or ad-hoc location), kickoff/end time,
  signup deadline, note, cancellation reason. Status machine (`draft →
  signup_open → signup_closed → teams_generated → teams_published →
  in_progress → completed`, plus `cancelled`) governed by
  [`lib/sessions/state.ts`](lib/sessions/state.ts).
- **Rolling 4-Sunday signup window**: players answer for the next four
  Sundays at once (`lib/sessions/upcoming.ts`), not just the nearest game.
  Signup stays open until the day *after* the game (default: end of the
  following Monday) so post-match corrections ("I actually didn't show")
  are possible — this is a deliberate MVP 1 design change captured in the
  `20260918120000_signup_window.sql` migration.
- **One-tap signup**: confirmed / maybe / declined, with a live confirmed
  count (Supabase Realtime on `signups`).
- **Automatic team balancing**: `lib/teams/generate-balanced-teams.ts`, a
  pure function that optimises ability spread, goalkeeper coverage,
  positional balance and stated preference in one weighted penalty, with
  randomised restarts and hill-climbing. Admins choose team count (the
  engine suggests sizes via `lib/teams/team-sizes.ts`), toggle which
  objectives apply, and can regenerate for a genuinely different split.
- **Manual team editing**: move players between teams, change a player's
  assigned position for that Sunday, mark someone unavailable after
  publish, add a late signup to a specific team, remove someone from the
  sheet — all without disturbing anyone else's placement
  (`app/actions/admin-teams.ts`).
- **Publish + scheduled reveal**: generating teams is private; publishing
  makes them official; a separate `teams_reveal_at` timestamp (default: end
  of the Friday before kickoff) controls when players actually *see* them,
  so organisers can finish teams early without spoiling the pitch talk.
  Reveal can be brought forward to "now" at any time.
- **Share text**: a plain-text team sheet for pasting into chat
  (`lib/teams/share-text.ts`).
- **Attendance record**: a matrix of the last 12 Sundays × active players,
  showing confirmed/maybe/declined per game and a played-count column
  (`app/admin/attendance/page.tsx`).
- **Admin dashboard**: surfaces "the next thing to do" per session via
  `nextAdminAction()` in `lib/sessions/state.ts` (open signup → close
  signup → generate teams → review & publish → start match day → complete).
- **Player management**: role changes, PIN resets, deactivate/reactivate,
  and delete-if-never-played (`lib/players/deletable.ts` — a player with any
  completed-session signup, team placement, or match event can only be
  deactivated, never deleted).
- **Group settings**: single-group defaults for venue, times, signup
  deadline offset, reveal offset, team colours (`groups` table; a second
  group is schema-legal but nothing in the UI supports running two).

### MVP 1.5 (schema exists, no UI)

The `matches` and `match_events` tables (scheduled order, timer state,
pause/resume, goals with scorer + optional assist, soft-deleted events) are
fully migrated and RLS-readable, and `requireScorekeeper` is wired up in
`lib/auth/current-user.ts` — but no route, page, or server action reads or
writes them yet. This is explicitly scaffolding for a future match-day
scoring UI, done now so it won't need a schema rewrite later.

### Explicitly out of scope (per `README.md` "What is deliberately not here")

No push notifications, chat, payments, tournaments, or automatic rating
changes (`calculated_rating` exists as a column for a future derived rating
but nothing ever writes to it — `effective_rating` currently always equals
`self_rating`).

## 4. Core user flows

**Player: answer for upcoming Sundays**
1. Sign in with name-linked PIN (or `joinAction` to register for the first
   time, setting a name, PIN, and position preferences).
2. Home screen lists up to the next 4 non-draft Sundays in the signup
   window (yesterday through +4 weeks), each with a live confirmed count.
3. Tap confirmed / maybe / declined per Sunday. Enforced server-side against
   `signupIsOpen()` — the deadline, not the UI, is authoritative.
4. If teams are already generated for that Sunday, a change of signup status
   flips `team_members.is_available` so the organiser sees it on the team
   sheet without anything being silently reshuffled.

**Admin: run a Sunday**
1. `createUpcomingSundaysAction` (or manual `saveSessionAction`) fills any
   gaps in the next four Sundays using group defaults for time, venue,
   signup deadline, and reveal time.
2. Session opens for signup automatically (`status: signup_open`).
3. Whenever ready — signup no longer needs to be closed first — admin opens
   the team generator, picks a team count (recommended sizes shown), toggles
   which balancing objectives to apply, and generates. This can be repeated
   ("Regenerate") for a different arrangement.
4. Admin fine-tunes the generated split by hand (move/add/remove players,
   reassign a position) and publishes.
5. Teams stay hidden from players until `teams_reveal_at`, or the admin
   brings the reveal forward to "now".
6. Admin moves the session through `in_progress` (venue details are
   snapshotted at this point so later venue edits don't rewrite history) to
   `completed`.

**Play → attendance record**
Once a session reaches `completed`, its confirmed signups count toward each
player's "Played" total on the attendance matrix — a durable, at-a-glance
record of who actually showed up, distinct from who merely said yes.

## 5. Success metric

Per `README.md`: **nobody has to pick teams on the pitch manually.** The app
is judged by whether team-picking moves entirely off the touchline and into
the app before kickoff, not by engagement, retention, or any other metric.

## 6. Non-functional constraints

- **Mobile-first.** The whole player-facing surface (signup, teams, profile)
  is designed for a phone screen used standing at the pitch; the attendance
  table is the one exception that intentionally scrolls horizontally on
  small screens rather than reflowing.
- **Ratings are private.** `getTeams(sessionId, includeRatings)` defaults
  `includeRatings` to `false`, and every player-facing call site must leave
  it that way; `player_positions` (self-ratings) and
  `team_members.position_rating_snapshot` carry no anon/authenticated grant
  at the database level, so even a compromised browser session cannot read
  them directly — this is enforced twice, in application code and in RLS
  column grants.
- **The browser never writes.** No INSERT/UPDATE/DELETE RLS policy exists on
  any table; every mutation goes through a server action that calls
  `requirePlayer` / `requireScorekeeper` / `requireAdmin` first. A leaked
  anon key cannot change data.
- **History is immutable.** Nothing is hard-deleted except a player who
  never played a completed Sunday (`canDeletePlayer`); everyone else is
  deactivated. Team membership snapshots the rating and preference rank at
  generation time so a later profile edit never rewrites a past Sunday's
  record. Match events are soft-deleted (`deleted_at`), never removed.
  Session venue details are snapshotted when a Sunday goes `in_progress` so
  a later venue edit doesn't rewrite completed history.
- **The balancing engine is pure and fast.** `lib/teams/*` has no React or
  Supabase dependency, is unit-testable in isolation, and balances a
  28-player Sunday in well under a second (per `README.md`).

## 7. Open questions

- **Scorekeeper role has no MVP 1 purpose.** `requireScorekeeper` and the
  role exist, but there is no UI action gated behind it yet (match events
  aren't built). Is this role meant to be assignable today in anticipation
  of MVP 1.5, or is it dead weight until then?
- **Multi-group support is ambiguous.** The schema supports multiple
  `groups` rows and several data/action functions take or imply a group
  scope, but `lib/data/groups.ts`'s `getGroup()` and the UI assume exactly
  one group exists. Is a second group a real near-term goal, or should the
  single-group assumption be made explicit (and the multi-tenant scaffolding
  removed) instead?
- **`calculated_rating` / derived ratings** (spec §34, referenced in a
  migration comment) has a column and generated-column fallback but no
  computation anywhere in the app. Is this still planned, and if so does it
  factor in match results once MVP 1.5 ships, or something else (e.g.
  admin-adjusted ratings)?
- **What "spec §NN" refers to.** Code comments throughout (`lib/sessions`,
  `lib/teams`, migrations) cite a numbered external spec ("spec §9", "spec
  §76", "spec §91", etc.) that isn't in this repository. This PRD is written
  from the code and README alone; a canonical spec document, if one exists,
  should be reconciled against this PRD.
- **Production readiness checklist** is mentioned in `README.md` ("work
  through the production checklist in the spec (§91)") but that checklist
  isn't in-repo either — only DEPLOYMENT.md's narrower Vercel/Supabase
  dashboard steps are.
- **Self-rating trust model.** Ratings feeding the balancer are entirely
  player self-reported (1–10, per position) with no admin override surfaced
  in the code I found other than editing a player's own profile. Is
  admin-adjusted rating override intentionally absent from MVP 1, or missing?
