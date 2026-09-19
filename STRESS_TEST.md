# Sunday Football — Stress Test

> Interrogates the design the way an incident review would — every claim
> below is tied to a file and, where useful, a line number, verified by
> reading the current code, not by extrapolating from the docs. For the
> condensed invariants and file map this review is checking, see
> [`ARCHITECTURE_ESSENTIALS.md`](ARCHITECTURE_ESSENTIALS.md); for the full
> architecture, [`ARCHITECTURE.md`](ARCHITECTURE.md).

### 1. Player count past ~35 / overlapping signup windows

**The real ceiling is 54 confirmed players for a single Sunday, not ~35, and
it fails with a misleading message.**
`recommendTeamSizes()` (`lib/teams/team-sizes.ts:35-56`) only considers
`teamCount` 2–6 and only keeps an option where every team is 5–9 players
(`MIN_TEAM_SIZE`/`MAX_TEAM_SIZE`, lines 11–12). At 55 confirmed players, no
`(teamCount, size)` combination fits — `recommendTeamSizes(55)` returns `[]`.
Two consequences:
- **`GenerateTeamsForm`** (`components/teams/generate-teams-form.tsx:31-38`)
  renders zero team-count buttons and shows: *"55 confirmed players are not
  enough to make teams of a sensible size. Wait for more signups."* — the
  literal opposite of the problem. An admin reading that message would
  reasonably wait for *more* signups, making it worse.
- **The daily cron job** (`app/api/cron/prepare-sunday/route.ts`) never
  passes an explicit `teamCount` (`prepareTeamsForSession(session.id, {
  publish: true, colours: ... })`, no `teamCount` key), so
  `lib/teams/prepare.ts:47-54` hits `if (!teamCount) throw new Error(...)`
  every single day, silently caught and logged as `"skipped: <message>"`
  (`route.ts` handler loop) — nothing surfaces this to an admin anywhere in
  the UI. `zod`'s `generateTeamsSchema.teamCount.max(6)`
  (`lib/validation/schemas.ts:111`) means even a hand-crafted form POST
  can't push past 6 teams to work around it.
- This is a **near-term** risk, not a hypothetical one: 55 is only 1.6× the
  group's stated ~35, reachable by one unusually large turnout, a guest
  night, or two groups merging for a week.

**A second, independent risk that gets *worse*, not better, as the roster
grows: player names are not unique at the database level.**
`players.name` (`20260918090000_init_schema.sql:78`) has only a length
`check`, no `unique` index — unlike `venues` (`unique(group_id, name)`,
line 158) or `groups.slug` (line 52). Uniqueness is enforced purely in
`joinAction` (`app/actions/auth.ts:88-101`) as a `select … ilike … maybeSingle()`
before the `insert` — a classic check-then-act race. Two players named
"Alex" tapping "I'm new" within the same request window both pass the
"is this name taken" check before either row exists, and both get inserted.
The login screen then can't distinguish them (`LoginForm`,
`app/(auth)/login-form.tsx:34-38`, filters by name substring only) — the
`player-search` roster picker becomes ambiguous exactly when the group is
largest and least likely for everyone to recognize a duplicate.

**Overlapping signup windows are not actually a bug** —
`upcomingWindow()`/`selectUpcoming()` (`lib/sessions/upcoming.ts:19-45`)
are explicitly designed so up to 4 Sundays' windows are open at once, and
`sessions` has `unique(group_id, date)`
(`20260918090000_init_schema.sql:193`), so two sessions can never collide
on the same date. I could not find a code path that assumes "exactly one
session is currently open for signup" — `getCurrentSession()`
(`lib/data/sessions.ts:23`) picks *a* representative session for
single-session UI (e.g. a hypothetical "today" banner) but nothing gates
writes on it being unique. If this sub-question was pointing at a specific
suspected bug, I didn't find one — flag it if you had a concrete scenario in
mind.

### 2. Untested (and one actively-wrong) balancing engine edge case

Cross-referencing `tests/teams/generate-balanced-teams.test.ts` against the
engine:

- **Zero goalkeeper-capable players, ever.** The only keeper-shortage test
  (`"still generates when there are fewer goalkeepers than teams"`, lines
  126–138) keeps exactly **one** GK-capable player (`Alex`) for 4 teams.
  Nothing tests `goalkeeperCapable.length === 0`. That path exists and looks
  handled — `evaluate.ts:145-147` falls back to "whoever has the *lowest*
  `bestRating` plays keeper" — but the fallback keeper is picked once, per
  team, independently, with no cross-team spreading logic at all (unlike the
  real-keeper path, which explicitly spreads keepers across teams in
  `buildCandidate`, `generate-balanced-teams.ts:162-171`). A group with
  nobody who lists GK as a preference (plausible for a casual 7-a-side crowd)
  is an entirely untested configuration for the algorithm's most heavily
  weighted objective (`WEIGHTS.goalkeeper = 10`, the largest single weight,
  `generate-balanced-teams.ts:18`).
- **Below 14 players.** `SCENARIOS` (test file lines 8–16) starts at 14. The
  `refusals` block only tests the *rejection* boundary (`testPlayers(5)` vs.
  4 teams, line 173) — never a *small but valid* game, e.g. 6 players into 2
  teams (passes `assertGeneratable`'s `players.length >= teamCount * 2`
  check, `generate-balanced-teams.ts:132`). At that size, the "covers
  defence, midfield and attack" assertion the 14+ tests rely on
  (`shapeImbalanceOf`, `evaluate.ts:197-207`) is structurally close to
  impossible to satisfy with 2–3 outfield players per team, and nothing
  verifies what `balanceScore` or `warnings` look like when it can't be —
  the smallest legitimate Sunday your engine will actually see (an under-14
  turnout, e.g. bad weather) is untested.
- **An entire squad with no saved positions.** The one test for missing
  preferences (`"places players who never saved a position"`, lines
  140–151) adds 2 blank players to 20 real ones. It never runs the case
  where *nobody* has preferences — plausible right after a bulk import or a
  broken onboarding step — which would also mean `goalkeeperCapable.length
  === 0` (same untested path as above, but reached differently: every
  player's `byPosition` map is empty, so `goalkeeperRating` is `null` for
  everyone via `preparePlayers`, `evaluate.ts:37-58`).
- **The 29-player "uneven teams" case is the only unevenness test**
  (lines 119–124) — nothing checks a 4-team split that's uneven *and* has a
  goalkeeper shortfall *and* missing preferences simultaneously, i.e. the
  actual worst-case Sunday (a small, disorganized group), only the
  individually-clean versions of each problem.

None of these are algorithmically broken as far as I can tell from reading
the code — they're just genuinely unverified, and the goalkeeper-fallback
path in particular (`evaluate.ts:145-147`) has no cross-team awareness at
all when it's the *only* path being exercised (zero real keepers), which is
worth a test before trusting it at that extreme.

### 3. The session-transition invariant is bypassed by the code that most needs it

This is the sharpest finding in this document, and it directly contradicts
a claim in `ARCHITECTURE.md` §6 that I wrote in the previous pass and had to
correct on rereading the code:

- `lib/teams/prepare.ts:113-119` sets `sessions.status` directly:
  ```ts
  await db.from("sessions").update({
    status: publish ? "teams_published" : "teams_generated",
    updated_by: options.actorId ?? null,
  }).eq("id", sessionId);
  ```
  **`prepare.ts` never imports `lib/sessions/state.ts`.** No
  `assertTransition` call exists anywhere in the file.
- Its only caller from the admin UI, `generateTeamsAction`
  (`app/actions/admin-teams.ts:17-70`), does *not* use `assertTransition`
  either, despite importing it (it's used elsewhere in the same file, lines
  202 and 230). Instead it hand-rolls a blocklist:
  ```ts
  if (session.status === "teams_published") return { ok:false, ... };
  if (session.status === "cancelled") return { ok:false, ... };
  if (session.status === "completed") return { ok:false, ... };
  ```
  Every other status — including `draft` — falls through and reaches
  `prepareTeamsForSession`, which will happily set it to
  `teams_generated`/`teams_published`. But `ALLOWED_TRANSITIONS['draft']`
  (`lib/sessions/state.ts:30`) is `['signup_open', 'cancelled']` only —
  `draft → teams_generated` is explicitly **not** a legal edge in the state
  machine this same codebase defines.
- It gets worse in the cron job:
  `app/api/cron/prepare-sunday/route.ts`'s `PREPARABLE` list is
  ```ts
  const PREPARABLE: SessionStatus[] = ["draft", "signup_open", "signup_closed", "teams_generated"];
  ```
  — **`draft` is explicitly included**, and the cron call always passes
  `publish: true`. So: an admin puts a Sunday back into `draft` (a legal,
  supported move — `signup_open → draft` and `cancelled → draft` are both
  in `ALLOWED_TRANSITIONS`, used e.g. to hide a Sunday under reconsideration)
  while `teams_reveal_at` is still set from creation
  (`defaultTeamsRevealAt`, computed unconditionally in
  `createUpcomingSundaysAction`, `app/actions/admin-sessions.ts:184`). If the
  next daily cron run falls inside the 18-hour `LOOKAHEAD_HOURS` window
  before that reveal time, the job will generate **and publish** teams for a
  session the admin explicitly pulled back to draft — jumping straight past
  `signup_open`, `signup_closed`, and `teams_generated` in one write, with
  no `assertTransition` anywhere in the call chain to catch it.
- Net effect: the state machine's own guarantee — "no server action calls
  `.update({status})` without going through `assertTransition`" — is true
  for `setSessionStatusAction`, `publishTeamsAction`, and
  `unpublishTeamsAction`, and **false** for the team-generation path, which
  is exactly the path most likely to run unattended (the cron job).

### 4. PIN auth: three concrete gaps, not generic "PINs are weak"

- **PIN space vs. lockout math is thin, not absent.** 4 digits = 10,000
  combinations (`pinSchema`, `lib/validation/schemas.ts:5-7`). Lockout is 5
  attempts → 10 minutes (`MAX_FAILED_ATTEMPTS`/`LOCKOUT_MINUTES`,
  `lib/auth/pin.ts:7-8`), scoped **per player** via
  `player_credentials.locked_until` (`loginAction`,
  `app/actions/auth.ts:36-57`) — there is no per-IP or global rate limit.
  Exhausting the full space against one target takes ~2,000 lockout cycles
  × 10 minutes ≈ 333 hours (~14 days) of sustained, automatable attempts —
  slow enough to deter casual guessing, comfortably within reach of anyone
  motivated against one specific player over two weeks, and the login page
  hands an attacker the full, unauthenticated roster to pick a target from
  (`app/(auth)/page.tsx:16`, `listPlayerNames(group.id)` — no auth check
  before the name list is fetched and rendered into `LoginForm`).
- **Changing or resetting a PIN does not revoke existing sessions.** The
  `sf_player` cookie is a `jose`-signed JWT containing only `{ sub: playerId
  }` (`lib/auth/session.ts:17-22`), and `readPlayerSession()`
  (`session.ts:34-45`) verifies signature + expiry only — it never touches
  the database. Neither `changePinAction` (`app/actions/profile.ts:57-86`)
  nor `resetPinAction` (`app/actions/admin-players.ts:11-31`) writes
  anything that `getCurrentUser()` checks, so a stolen cookie stays valid
  for the full 60-day `MAX_AGE_SECONDS` (`session.ts:7`) even after the
  player (or an admin, on their behalf) changes the PIN specifically
  *because* it may have leaked. The one thing that *does* cut off an
  existing session is deactivation — `getCurrentUser()` checks
  `player.is_active` (`current-user.ts:36`) on every call — so
  `setPlayerActiveAction(active: false)` works as a kill switch, but "reset
  their PIN" (the obviously-reached-for response to "I think someone else
  has my PIN") does not.
- **Shared-device session lifetime has no idle timeout.** 60 days,
  `httpOnly`, no re-authentication prompt, no "sign out everywhere," no
  activity-based expiry. On a phone borrowed for one Sunday, or a shared
  clubhouse tablet used to sign up several players in turn, whoever is
  logged in when the device is later picked up stays logged in as that
  player for up to two months unless someone manually taps "Sign out"
  (`logoutAction`, `app/actions/auth.ts:137-146`).

### 5. Schema built ahead of need (MVP 1.5) and its actual cost today

- `matches` (`20260918090000_init_schema.sql:271-296`) and `match_events`
  (lines 298-316) are fully migrated, RLS-enabled with read policies
  (`20260918090100_rls.sql:61-66`), and added to the realtime publication
  (lines 88-93) — all before a single route or component reads or writes
  them. `requireScorekeeper` (`lib/auth/current-user.ts:86-92`) is likewise
  live infrastructure for a role nothing currently gates.
- **The cost isn't hypothetical complexity — it's the RLS/publication
  surface area that's already live in production for tables nobody uses.**
  `match_events` is readable by `anon` right now
  (`match_events_read` policy, `20260918090100_rls.sql:65-66`, `using
  (deleted_at is null)`) and streams over Supabase Realtime — a fully
  wired, publicly-readable channel for a feature with no writer, which is a
  strange thing to have live rather than a genuine architecture cost; it's
  cheap to leave as-is but worth knowing it's not inert.
- **`groups.default_max_players`** (line 62 of the init migration) is
  another premature column: `check (default_max_players is null or
  default_max_players > 0)`, never read by any query I found in `lib/` or
  `app/` — session-capacity enforcement (turning signup away once a venue is
  full) isn't implemented, so the column is schema for a rule the product
  doesn't enforce yet.
- **`player_positions.calculated_rating`** (line 131) and the generated
  `effective_rating` column (line 132) are the same pattern already flagged
  in `PRD.md` §7 — worth repeating here because it's the same "designed
  ahead of the writer" shape as `matches`/`match_events`: a real generated
  column, a real fallback expression, and zero code that ever populates the
  thing it falls back from.
- None of this is *wrong* — the README explicitly frames it as "MVP 1.5
  without a schema rewrite" — but "already RLS-readable and on the realtime
  publication" is a meaningfully bigger commitment than "the tables exist,"
  and is the part actually worth re-examining before MVP 1.5 design starts,
  rather than assuming the schema is inert until then.

### 6. Immutability enforced only by convention, not by constraint

The clearest, most concrete gap in the whole review: **the two foreign keys
that matter most for "history is immutable" are `ON DELETE CASCADE`, not
`RESTRICT`.**

```
supabase/migrations/20260918090000_init_schema.sql:212
  player_id uuid not null references players (id) on delete cascade   -- signups

supabase/migrations/20260918090000_init_schema.sql:251
  player_id uuid not null references players (id) on delete cascade   -- team_members
```

The *only* thing preventing a `DELETE FROM players` from silently erasing a
completed Sunday's confirmed signups and rating-snapshotted team placements
is `canDeletePlayer()` (`lib/players/deletable.ts:22-47`), checked exactly
once, inside `deletePlayerAction`
(`app/actions/admin-players.ts:112-167`). There is no database trigger, no
`RESTRICT` foreign key, nothing in `tests/db/schema.test.ts` (I checked —
the schema tests replay migrations and verify structure/constraints, not
this application-level invariant) that would catch a regression if a future
code path — a script, a different action, a Supabase dashboard delete, a
refactor that swaps `deletePlayerAction`'s guard for something weaker —
deleted a player row directly. The guarantee "nothing is hard-deleted"
holds only as long as every write path funnels through that one function,
forever.

Contrast this with `match_events.player_id`/`assist_player_id`
(`init_schema.sql:304-305`), which are `ON DELETE SET NULL` — a real,
schema-level guarantee that the *event* row survives a player deletion even
though attribution is lost. That's a materially different (and stronger)
history guarantee than `signups`/`team_members` get, and it's inconsistent
with them for no apparent reason — if the intent is "history survives a
deleted player," `signups` and `team_members` should probably use the same
`SET NULL` pattern (or, better, `RESTRICT`, forcing every deletion attempt
through the same check the application already performs) rather than
`CASCADE`.

The `team_members`/`sessions` rating and venue **snapshot columns**
themselves (`position_rating_snapshot`, `preference_rank_snapshot`,
`venue_name_snapshot`/`venue_address_snapshot`/`venue_notes_snapshot`) are
plain, unconstrained columns too — nothing stops a future `UPDATE` from
rewriting them after the fact (unlike, say, the `set_updated_at()` triggers
that *do* exist for touch-timestamp maintenance on most tables). Today,
exactly one code path writes each of them, once — `lib/teams/prepare.ts:105-106`
for the rating snapshot, `admin-sessions.ts:91-95` for the venue snapshot —
so the invariant holds in practice, but it holds because nobody has written
the second call site yet, not because the schema would refuse one.
