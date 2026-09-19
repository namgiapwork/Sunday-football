# Sunday Football — Architecture Essentials

> Condensed from [`ARCHITECTURE.md`](ARCHITECTURE.md) into what a
> contributor needs before their first edit. For the full request/write-path
> diagram, data model, and auth model, read that file. For a critical
> stress test of these same invariants — where they hold only by convention,
> what's untested, what breaks as the group grows — see
> [`STRESS_TEST.md`](STRESS_TEST.md).

## Invariants that must never break

These mirror `CLAUDE.md` exactly; each is enforced in a specific place, not
by convention alone (except where `STRESS_TEST.md` says otherwise):

1. **The browser never writes.** No `INSERT`/`UPDATE`/`DELETE` RLS policy
   exists anywhere (`supabase/migrations/20260918090100_rls.sql`). The one
   client that can bypass RLS, `supabaseAdmin()`
   (`lib/supabase/admin.ts:19`), is `server-only` and only ever imported from
   `app/actions/*`, `app/api/*`, and `lib/data/*`.
2. **A PIN session can never become admin.** `getCurrentUser()`
   (`lib/auth/current-user.ts:49`) downgrades `admin → scorekeeper` unless
   the session came from Supabase Auth (`strongAuth`). There is no upgrade
   path inside the app — only the `on_auth_user_created` DB trigger
   (`20260918090200_auth_link.sql`), fired from the Supabase dashboard.
3. **Ratings stay private.** `getTeams(sessionId, includeRatings=false)`
   (`lib/data/teams.ts:27`) — every player-facing call site must leave the
   default. `player_positions` and `team_members.position_rating_snapshot`
   carry no anon/authenticated GRANT at all (`20260918090100_rls.sql:72`).
4. **History is immutable** — mostly. Team membership snapshots ratings at
   generation time (`lib/teams/prepare.ts:105-106`); session venue details
   snapshot once, on entering `in_progress`
   (`app/actions/admin-sessions.ts:91-95`). Players are deactivated, not
   deleted, unless `canDeletePlayer()` (`lib/players/deletable.ts:22`) says
   they never played. **This one is weaker than it looks — see
   `STRESS_TEST.md` §6.**
5. **The balancing engine is pure.** `lib/teams/generate-balanced-teams.ts`,
   `evaluate.ts`, `positions.ts`, `types.ts`, `team-sizes.ts` import neither
   React nor `@supabase/*`. `lib/teams/prepare.ts` is the one deliberate
   orchestration boundary — it calls the pure engine, then writes.
6. **Session transitions go through `assertTransition`.** True for
   `setSessionStatusAction` (`app/actions/admin-sessions.ts:80`),
   `publishTeamsAction` (`admin-teams.ts:202`), and `unpublishTeamsAction`
   (`admin-teams.ts:230`). **Not true for team generation — see
   `STRESS_TEST.md` §3, the sharpest finding in that review.**

## File map (where to look first)

```
app/actions/        every mutation — start here for "what can change X"
  admin-teams.ts       generate/publish/move/add/remove team members
  admin-sessions.ts    create/edit Sundays, status transitions, venues
  admin-players.ts     roles, PIN resets, deactivate/delete
  auth.ts              login, join, admin login, password reset
  signup.ts            confirmed/maybe/declined
  profile.ts           name, positions, own PIN
app/api/cron/        the one non-Server-Action write path (daily job)
lib/teams/           the pure balancing engine + its orchestration wrapper
  generate-balanced-teams.ts   the algorithm (restarts + hill-climb)
  evaluate.ts                  per-team scoring, position assignment
  prepare.ts                   ★ impure — reads confirmed players, writes teams
lib/sessions/        the state machine and the signup/reveal date math
  state.ts             ALLOWED_TRANSITIONS, teamsVisible(), signupIsOpen()
  deadline.ts          default signup-close / reveal-at computation
  upcoming.ts          the rolling 4-week window players see
lib/auth/            who's asking, and what they're allowed to do
  current-user.ts      getCurrentUser() + require{Player,Scorekeeper,Admin}
  session.ts            the PIN JWT cookie (sign/verify only, no DB check)
  pin.ts                 bcrypt hash/verify, lockout constants
lib/data/            read-only queries, always via supabaseAdmin()
lib/supabase/        the three client constructors (admin/server/browser)
supabase/migrations/ schema, in five dated files — see ARCHITECTURE.md §3
tests/db/            replays every migration against PGlite
tests/teams/         the balancing engine's own test suite
```

## The one-paragraph mental model

Every table exposes almost nothing to the browser and nothing writable at
all; the app's actual authority lives entirely in `app/actions/*` functions
that re-derive who's asking (`requirePlayer`/`requireScorekeeper`/
`requireAdmin`, always from the database, never from a cookie claim) and
re-check business rules the UI already enforced client-side, because the UI
is not trusted. A Sunday moves through an explicit status graph
(`lib/sessions/state.ts`) that a *pure* function
(`generateBalancedTeams`) — no I/O, no framework — turns confirmed signups
into teams for, and everything downstream (publish, reveal, attendance) just
reads that status and a couple of timestamps. When you're about to add a
feature, ask two questions: which `require*` guard gates it, and which
`ALLOWED_TRANSITIONS` edge does it assume — if the answer to the second is
"none, I didn't check," read `STRESS_TEST.md` §3 before you ship it.
