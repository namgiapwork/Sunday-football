# Sunday Football — working notes

Read `README.md` first: architecture, setup, and how the balancing engine works.

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
  deactivated, match events are soft-deleted.
- **The balancing engine is pure.** `lib/teams/*` must not import React or
  Supabase. Database orchestration belongs in the action that calls it.
- **Session status drives the UI**, and transitions go through
  `assertTransition` in `lib/sessions/state.ts`.

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
