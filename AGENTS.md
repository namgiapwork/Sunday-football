# Sunday Football — working notes

Read `README.md` first: architecture, setup, and how the balancing engine works.
`ARCHITECTURE.md` and `ARCHITECTURE_ESSENTIALS.md` go deeper on the request/write
path, data model, and auth model; `STRESS_TEST.md` is a critical review — the
sharpest findings are folded into the invariants below, don't reintroduce them.

## Invariants worth not breaking

- **The browser never writes.** All mutations go through server actions in
  `app/actions/`, which call `requirePlayer` / `requireScorekeeper` /
  `requireAdmin` before touching data. RLS grants the anon key read access only,
  by column, and no write policies exist at all.
- **Admin rights need Supabase Auth.** A PIN session is downgraded to
  `scorekeeper` in `lib/auth/current-user.ts`, whatever the database says.
- **Ratings are private.** `getTeams(sessionId, includeRatings)` defaults to
  `false`; player-facing pages must never pass `true`. `player_positions` has no
  anon grant.
- **History is immutable.** Team membership stores a rating snapshot, sessions
  snapshot their venue when they start, and nothing is hard-deleted — players are
  deactivated, match events are soft-deleted. This is enforced by convention,
  not by the schema: `signups.player_id` and `team_members.player_id` are
  `ON DELETE CASCADE`, so it only holds because the only player-delete path,
  `deletePlayerAction`, checks `canDeletePlayer()` first. Never add another
  way to delete a `players` row without that same check.
- **The balancing engine is pure.** `lib/teams/*` must not import React or
  Supabase. Database orchestration belongs in the action that calls it.
  A squad with zero goalkeeper-capable players, or fewer than 14 players, is
  untested — don't assume the existing suite covers a change there; add cases.
- **Session status drives the UI**, and transitions go through
  `assertTransition` in `lib/sessions/state.ts` — except team generation.
  `lib/teams/prepare.ts` writes `sessions.status` directly, and the cron job
  (`app/api/cron/prepare-sunday`) treats `draft` as preparable, so it can
  generate and publish teams for a session an admin pulled back to draft.
  Don't copy that shortcut into new code; if you touch either file, route it
  through `assertTransition` instead of extending the bypass.

## Before changing the schema

Add a migration in `supabase/migrations/` — never edit an applied one. The schema
tests in `tests/db/` replay every migration against PGlite, so a broken migration
fails `npm test` without needing Docker or a Supabase project.

## Commands

```bash
npm run dev
npm test
npm run typecheck
npm run lint
npm run db:migrate   # needs DATABASE_URL
npm run db:reset     # drop, migrate, seed — development only
```
