# Sunday Football

A mobile-first web app for a recurring football group of ~35 players. It replaces
the Messenger routine of asking who is free, counting heads, and splitting teams
on the pitch.

**Signup → team generation → published teams → play.**

## What is built

This is **MVP 1** — the first production release described in the spec (§45):

- Player profiles with position preferences and self-ratings
- Lightweight PIN sign-in for players, Supabase Auth for organisers
- Sunday sessions with venue, kickoff and signup deadline
- Players answer for the **next four Sundays**, not just the nearest one
- One-tap signup with a live confirmed count
- Attendance record showing who played which date
- Admin dashboard that always shows the next thing to do
- **Automatic team balancing** with manual editing, publishing and sharing

The database schema also covers fixtures, matches and goals so MVP 1.5 can be
added without a migration rewrite, but there is no match-day UI yet.

## Architecture

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Tailwind 4 |
| Database | Supabase Postgres |
| Realtime | Supabase Realtime, scoped per session |
| Auth | Signed cookie for player PINs; Supabase Auth for admins |
| Hosting | Vercel |

Two rules shape the code:

1. **The browser only reads.** Every write goes through a Next.js server action
   holding the service-role key, which authorises the caller itself. There are no
   INSERT/UPDATE/DELETE policies, so a leaked anon key changes nothing.
2. **Domain logic is pure.** `lib/teams` and `lib/sessions` know nothing about
   React or Supabase, so they can be unit tested and replaced independently.

```
app/(auth)     sign in, onboarding
app/(player)   home (upcoming Sundays), teams, profile
app/admin      dashboard, players, sessions, team generator
app/actions    server actions — the only place data is written
components/    UI, grouped by domain
lib/teams      balancing engine, team sizes, share text
lib/sessions   session state machine
lib/data       server-side reads
lib/auth       PIN hashing, session cookie, role guards
supabase/      migrations and seed
tests/         unit and schema tests
```

## Local development

Requires Node 20+, and a Supabase project to point at.

- **Trying it out, or working on a feature?** Create your own — free, about two
  minutes. You get the seeded demo squad and cannot break anyone's real Sunday.
- **Co-maintaining the live group?** Ask to be added to the existing Supabase
  project and take the keys from its dashboard yourself, rather than having them
  pasted to you. Same access, but it can be revoked later and no service-role key
  ends up sitting in a chat history.

```bash
npm install
npm run setup           # asks for your project URL and API keys
npm run setup:supabase  # stores an account token so migrations can be applied
npm run db:apply        # creates the tables
npm run db:seed         # 35 demo players, a played Sunday and some upcoming ones
npm run dev             # http://localhost:3000
```

Every seeded player's PIN is `1234`. For an admin account, see
[DEPLOYMENT.md](DEPLOYMENT.md) — organisers sign in with an email rather than a
PIN.

### What goes in .env.local

`npm run setup` writes most of it, generating `SESSION_SECRET` and `CRON_SECRET`
itself. If you would rather fill it in by hand:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API → service_role |
| `DATABASE_URL` | Project settings → Database → Connection string → URI |
| `SESSION_SECRET` | `openssl rand -base64 48` |

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never reach the browser. It is
only read inside `lib/supabase/admin.ts`, which is marked `server-only`.

### 2. Create the schema

```bash
npm run db:migrate
```

### 3. Add the demo data (development only)

```bash
npm run db:seed
```

That creates 35 players, a completed Sunday with four teams and six matches, and
an upcoming Sunday with signup open. **Every seeded player's PIN is `1234`.**

To start over: `npm run db:reset` (drops the public schema, migrates, seeds).

### 4. Run it

```bash
npm run dev
```

## Creating your first admin

Admins need the stronger email login, not a PIN.

1. Supabase dashboard → Authentication → Users → **Add user**, with an email and
   password.
2. Make sure a player row carries the same email:

   ```sql
   update players set email = 'you@example.com' where name = 'Your Name';
   update group_members set role = 'admin'
    where player_id = (select id from players where name = 'Your Name');
   ```

The `on_auth_user_created` trigger links the two automatically by email. If you
created the auth user first, re-run `npm run db:migrate` — the migration
backfills existing users.

Then sign in at `/admin-login`.

## Tests

```bash
npm test          # 121 tests
npm run typecheck
npm run lint
```

The schema tests run the real migrations against **PGlite**, a WASM Postgres, so
constraints, generated columns and the seed are all executed for real — no Docker
needed.

The highest-value tests cover the balancing engine (§44): every attendance
scenario from 14 to 35 players is checked for complete assignment, even team
sizes, goalkeeper spread, positional coverage and first-choice preference.

## The balancing engine

`lib/teams/generate-balanced-teams.ts` is pure:

```ts
generateBalancedTeams(players, teamCount, options)
  → { teams, metrics, penalty, warnings }
```

It optimises four objectives at once (spec §11), lower being better:

```
penalty = 4 × ability spread
        + 10 × teams left without a goalkeeper
        +  6 × positional imbalance
        +  3 × preference penalty
```

It runs many randomised restarts, then hill-climbs by swapping players between
teams, keeping the best arrangement. A 28-player split takes well under a second.

`Regenerate` passes the previous arrangement back in, and a novelty term pushes
the optimiser towards a genuinely different split rather than the same optimum.

The `balanceScore` out of 100 is an indicator for the organiser, not a scientific
measure, and it recalculates immediately after every manual move.

## Deploying

`main` deploys to production through Vercel; every branch gets a preview.

**See [DEPLOYMENT.md](DEPLOYMENT.md)** before standing this up somewhere new. Some
required configuration lives in the Supabase and Vercel dashboards rather than in
this repository — auth redirect URLs, and turning off Vercel's Deployment
Protection. Without those, password reset links break and the site sits behind a
Vercel login wall.

Before inviting the whole group, work through the production checklist in the
spec (§91): RLS enabled, admin created, a venue added, and one Sunday run
end-to-end on a phone.

## What is deliberately not here

No push notifications, chat, payments, tournaments, or automatic rating changes.
The app exists to organise one football group, and the first success metric is
simply that nobody has to pick teams on the pitch any more.
