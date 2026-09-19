# Sunday Football — Architecture

> Describes the system as it is implemented, verified against
> `package.json`, `app/actions/`, `lib/teams/`, `lib/sessions/`, `lib/auth/`,
> `lib/data/`, and every migration in `supabase/migrations/`. Companion to
> [`PRD.md`](PRD.md) (product scope) and [`README.md`](README.md) (setup).

## 1. Tech stack

| Layer | Choice | Verified version (`package.json`) |
| --- | --- | --- |
| Framework | Next.js, App Router | `next@16.3.5` |
| UI | React | `react@19.2.8` / `react-dom@19.2.8` |
| Styling | Tailwind CSS | `tailwindcss@^4`, `@tailwindcss/postcss@^4` |
| Database | Supabase Postgres | `@supabase/supabase-js@^2.116.0` |
| Auth (browser session refresh, admin login) | `@supabase/ssr` | `^0.12.7` |
| Realtime | Supabase Realtime (via `@supabase/ssr` browser client) | same package |
| Player auth | Signed JWT cookie (`jose`) + PIN hash (`bcryptjs`) | `jose@^6.2.12`, `bcryptjs@^3.0.3` |
| Validation | Zod | `^4.6.5` |
| Hosting | Vercel (per `README.md`/`DEPLOYMENT.md`; no in-repo verification possible) | — |
| Schema tests | PGlite (WASM Postgres) | `@electric-sql/pglite@^0.5.8` |
| Tests | Vitest | `^5.0.1` |

This matches the table in `README.md` exactly — no drift found between the
docs and `package.json`.

## 2. Request / write path

**Rule (`CLAUDE.md`, `README.md`): the browser only ever reads.** Every
mutation is a Next.js Server Action (`"use server"` files under
`app/actions/`) or a cron Route Handler (`app/api/cron/`), both of which run
on the server and are the only code that ever imports
`lib/supabase/admin.ts`.

```
┌─────────────┐        ┌──────────────────────────┐        ┌───────────────────┐
│   Browser   │        │   Next.js server (Vercel) │       │  Supabase Postgres │
│             │        │                            │       │                    │
│ React Server│ read   │  Server Components         │  read │  anon-key grants:  │
│ Components  │◄───────┤  (lib/data/*.ts)           │◄──────┤  column-level SELECT│
│ (rendered   │        │  via supabaseAdmin()        │       │  only, no writes    │
│  HTML)      │        │  (service-role key)         │       │                     │
│             │        │                            │       │                     │
│ Client      │ read + │  supabaseBrowser()          │  read │  RLS: SELECT-only   │
│ Components  │ realtime│ (anon key) — realtime      │◄──────┤  policies; zero     │
│ (counts,    │◄───────┤  subscriptions + narrow     │       │  INSERT/UPDATE/     │
│  live UI)   │        │  read-only queries only      │       │  DELETE policies    │
│             │        │                            │       │  exist at all       │
│ <form       │ POST   │  Server Action              │ write │                     │
│  action={   │───────►│  ("use server", app/actions)│──────►│  supabaseAdmin()   │
│  serverFn}> │        │  1. requirePlayer/          │       │  (service-role key,│
│             │        │     requireScorekeeper/     │       │  bypasses RLS       │
│             │        │     requireAdmin()          │       │  entirely)          │
│             │        │  2. zod-validate input       │       │                     │
│             │        │  3. re-check business rules  │       │                     │
│             │        │     (e.g. signupIsOpen(),    │       │                     │
│             │        │     assertTransition())      │       │                     │
│             │        │  4. supabaseAdmin() write     │       │                     │
│             │        │  5. revalidatePath()          │       │                     │
└─────────────┘        └──────────────────────────┘        └───────────────────┘

Cron: Vercel Scheduler ──GET, Authorization: Bearer $CRON_SECRET──► app/api/cron/prepare-sunday/route.ts
                                                                      │
                                                                      ▼
                                                          prepareTeamsForSession()
                                                          (same code path as the
                                                           admin's "Generate teams"
                                                           button — supabaseAdmin())
```

### Why there are no write policies

`supabase/migrations/20260918090100_rls.sql` enables RLS on every table, then
grants `anon`/`authenticated` **column-scoped SELECT only** (e.g. `players`
exposes `id, name, avatar_url, is_active` — `email` and `auth_user_id` are
withheld; `player_credentials` and `player_positions` get no grant at all).
No `for insert`, `for update`, or `for delete` policy exists anywhere in the
schema — Postgres denies by default in that case, so even a row a role could
otherwise `SELECT` cannot be mutated by that role.

This works only because the service-role key that bypasses RLS
(`lib/supabase/admin.ts`) **never reaches client-side code**:
- `admin.ts` is `import "server-only"` — a build-time guard that fails the
  bundle if a Client Component ever imports it.
- The key itself is read from `serverEnv()` (`lib/env.ts`), a
  server-only-tagged module, and is never part of `NEXT_PUBLIC_*` env vars.
- The browser's own Supabase client (`lib/supabase/client.ts`,
  `supabaseBrowser()`) is constructed with the anon key and is used, by
  grep, only for two things: Realtime channel subscriptions and a couple of
  narrow read-only `select()` queries in Client Components
  (`components/sessions/attendance-counter.tsx`,
  `components/sessions/session-list.tsx`) — both RLS/GRANT-restricted like
  any other anon-key call.

So a leaked anon key changes nothing: at most it can read what RLS already
permits. A leaked service-role key would be catastrophic, which is exactly
why its one Node module is marked `server-only` and its one call site,
`supabaseAdmin()`, is only ever imported from `app/actions/*`, `app/api/*`,
and `lib/data/*` (itself only called from server code).

**One deviation from "every write is a server action":** the password-reset
form (`app/(auth)/admin-reset/set-password-form.tsx`) calls
`supabaseBrowser().auth.updateUser({ password })` directly from the browser.
This is not a gap in the RLS model — it writes to Supabase Auth's own
`auth.users`, which is a separate system from the `public.*` schema this
document's RLS analysis covers, and Supabase's password-recovery flow
requires the recovery token (delivered via URL fragment) to be exchanged for
a session in the browser itself. It is the one legitimate exception to "the
browser only reads."

## 3. Data model

All UUID primary keys (`gen_random_uuid()`), all timestamps `timestamptz`
(UTC) except `sessions.date`/`start_time`/`end_time`, which are local to the
group's `timezone`. Source: `20260918090000_init_schema.sql` plus the three
follow-up migrations.

| Table | Key columns | Relationships | Notes |
| --- | --- | --- | --- |
| `groups` | `id`, `slug` (unique), `timezone`, `default_start_time`/`default_end_time`, `default_signup_close_days_after` *(added in `signup_window`)*, `default_teams_reveal_days_before`/`_time` *(added in `teams_reveal`)*, `team_colours[]` | `default_venue_id → venues` | Single row in practice (`getGroup()` takes the first by `created_at`); schema tolerates more |
| `players` | `id`, `name` (unique among active, enforced in app code not DB), `email` (unique, partial index, nullable), `auth_user_id` (unique, partial index, nullable) | referenced by almost everything | `is_active` — never hard-deleted except via `canDeletePlayer`'s narrow allowance |
| `player_credentials` | `player_id` (PK, FK → `players`, cascade) | 1:1 with `players` | `pin_hash`, `failed_attempts`, `locked_until` — split into its own table specifically so it can be excluded from the RLS/GRANT surface entirely |
| `group_members` | `id`, unique(`group_id`,`player_id`) | `group_id → groups`, `player_id → players` | Carries `role` (`player\|scorekeeper\|admin`) and `is_active` — **this is where role lives, not on `players`** |
| `player_positions` | `id`, unique(`player_id`,`preference_rank`), unique(`player_id`,`position`) | `player_id → players` | `self_rating` (1–10), `calculated_rating` (nullable, never written to by any code path found), `effective_rating` = generated column `coalesce(calculated_rating, self_rating)` — no anon/authenticated grant at all |
| `venues` | `id`, unique(`group_id`,`name`) | `group_id → groups` | |
| `sessions` | `id`, unique(`group_id`,`date`), unique(`id`,`group_id`) *(composite FK target)* | `group_id → groups`, `venue_id → venues` (nullable) | `status` (8-value enum, see §6); `venue_name_snapshot`/`_address_snapshot`/`_notes_snapshot` frozen at `in_progress`; `signup_deadline` (added meaning changed by `signup_window` migration); `teams_reveal_at` (added by `teams_reveal` migration); check constraint forces `cancellation_reason` whenever `status = 'cancelled'` |
| `signups` | `id`, unique(`session_id`,`player_id`) | `session_id → sessions` (cascade), `player_id → players` (cascade) | `status`: `confirmed\|maybe\|declined` — one row per player per Sunday, upserted |
| `teams` | `id`, unique(`session_id`,`display_order`), unique(`session_id`,`name`), unique(`id`,`session_id`) *(composite FK target)* | `session_id → sessions` (cascade) | `published` boolean gates player visibility independent of the reveal-time gate |
| `team_members` | `id`, unique(`team_id`,`player_id`), **unique(`session_id`,`player_id`)** | composite FK `(team_id, session_id) → teams(id, session_id)`, `player_id → players` (cascade) | **History snapshot table**: `position_rating_snapshot` and `preference_rank_snapshot` are copied at generation time and never recalculated from live `player_positions`; `is_available` is the post-publish dropout flag |
| `matches` | `id`, unique(`session_id`,`scheduled_order`), unique(`id`,`session_id`) | composite FKs `team_a_id`/`team_b_id → teams(id, session_id)` | MVP 1.5 — schema only, no read/write code path exists in `app/` today |
| `match_events` | `id` | composite FK `(match_id, session_id) → matches(id, session_id)`, `team_id → teams` | MVP 1.5 — **soft-delete table**: `deleted_at`, never a `DELETE`; `assist_player_id <> player_id` check |

### Snapshot-vs-live pattern (the "history is immutable" rule)

Two places explicitly copy a value at a point in time instead of storing a
foreign key alone, and both are called out in code comments:

1. **`team_members.position_rating_snapshot` / `preference_rank_snapshot`**
   — written once in `lib/teams/prepare.ts` (`prepareTeamsForSession`) from
   the `AssignedPlayer.rating`/`preferenceRank` the balancing engine
   computed at generation time. If a player edits their profile afterwards
   (`app/actions/profile.ts`, `updateProfileAction`), `player_positions`
   changes but every `team_members` row for a past or already-generated
   Sunday keeps its old value — "this is what the next teams will be picked
   from," per the action's own success message.
2. **`sessions.venue_name_snapshot` / `_address_snapshot` / `_notes_snapshot`**
   — written once in `app/actions/admin-sessions.ts`
   (`setSessionStatusAction`), only on the transition into `in_progress`,
   only if not already set. A later edit to the `venues` row (or swapping
   `venue_id`) never rewrites a Sunday that has already kicked off.

Everything else that looks like duplication — `signups.status` vs
`team_members.is_available`, for instance — is a deliberate **two-fact**
model, not a snapshot: `signups` is "what they said," `team_members` is
"what the team sheet shows," and `setSignupAction` explicitly keeps the
second in sync with the first (§4 below) without merging the concepts.

## 4. Auth model

Two independent session mechanisms coexist, both resolved into one
`CurrentUser` shape by `getCurrentUser()` in `lib/auth/current-user.ts`:

| | Player PIN | Supabase Auth (admin) |
| --- | --- | --- |
| Credential | 4-digit PIN, `bcrypt` hash (10 rounds) in `player_credentials` | Email + password in Supabase's own `auth.users` |
| Session storage | Custom `sf_player` HTTP-only cookie, a `jose`-signed JWT (`{ sub: playerId }`), 60-day expiry | Supabase's own auth cookies, refreshed by `proxy.ts` middleware on every request |
| Brute-force defence | 5 failed attempts → 10-minute lockout (`lib/auth/pin.ts`); a non-existent player still runs `dummyVerify()` so timing can't reveal who exists | Supabase Auth's own (not in this repo) |
| Sign-in entry point | `/` → `loginAction` (`app/actions/auth.ts`) | `/admin-login` → `adminLoginAction` |
| Can this session become `admin`? | **Never** | Yes, if the linked player's `group_members.role = 'admin'` |

### The downgrade rule

`getCurrentUser()` reads `role` from `group_members` — genuinely a database
value — but applies one hard rule before returning it
(`lib/auth/current-user.ts:46-58`):

```ts
role: authUser ? membership.role : downgrade(membership.role),
// downgrade(): admin → scorekeeper, everything else unchanged
```

So a PIN-only session is capped at `scorekeeper` even if that player's
`group_members.role` is literally `'admin'` in the database — there is no
code path where a forged or replayed PIN cookie yields admin rights. Reaching
`admin` requires `supabaseAuthUser()` to resolve a real Supabase Auth user
*and* that user's `auth_user_id` to match a `players` row *and* that row's
`group_members.role` to be `'admin'`. The link between a Supabase Auth user
and a `players` row is made once, automatically, by the
`on_auth_user_created` trigger (`20260918090200_auth_link.sql`), matched by
lower-cased email — there's no in-app "become admin" action at all.

Three guard functions build on `getCurrentUser()`, each throwing
`AuthError` (for server actions, which surface the message in the form) or
redirecting (for page loads, via the `*Page` variants):
`requirePlayer` → `requireScorekeeper` (rejects `role === 'player'`) →
`requireAdmin` (rejects anything but `'admin'`, with a message that
specifically tells a scorekeeper-via-PIN admin that they need "the email
login, not a PIN" — i.e. the code anticipates this exact downgrade case and
explains it to the user rather than just failing silently).

## 5. The balancing engine

`lib/teams/generate-balanced-teams.ts` exports one function:

```ts
generateBalancedTeams(
  players: GeneratorPlayer[],   // { id, name, positions: {position, preferenceRank, rating}[] }
  teamCount: number,
  options?: GenerateTeamsOptions,
) → {
  teams: GeneratedTeam[],       // per-team player list + assigned position + rating totals
  metrics: BalanceMetrics,      // spread, stddev, goalkeeper gaps, positional imbalance, preference stats, balanceScore 0-100
  penalty: number,              // raw weighted score, only meaningful vs. another run with the same weights
  warnings: string[],           // e.g. "too few goalkeepers", "teams are uneven"
}
```

**No import in `lib/teams/*` touches React or `@supabase/*`** — confirmed by
inspection of `generate-balanced-teams.ts`, `evaluate.ts`, `prepare.ts` is
the one exception, and it is explicitly the orchestration boundary (see
below). This buys three things the codebase actually exercises:
1. **Unit-testability without a database or a browser** —
   `tests/teams/generate-balanced-teams.test.ts` runs every attendance count
   from 14–35 players and checks completeness, even sizes, goalkeeper
   spread, and positional coverage, entirely in-process.
2. **Determinism on demand** — `options.seed` feeds a self-contained
   `mulberry32` PRNG (no `Math.random()` inside the algorithm itself, only
   as the *default* seed source), so a generation can be replayed exactly.
3. **Reuse across two call sites that must never diverge** — the admin's
   "Generate teams" button (`app/actions/admin-teams.ts`,
   `generateTeamsAction`) and the daily cron job
   (`app/api/cron/prepare-sunday/route.ts`) both go through the same
   `prepareTeamsForSession()` wrapper in `lib/teams/prepare.ts`, which is the
   one place that is *not* pure — it reads confirmed signups and existing
   teams from the database, calls the pure engine, then writes `teams` and
   `team_members` rows and updates `sessions.status`. The engine itself never
   sees a database handle.

Algorithm shape, matching the weighted-penalty model documented in
`README.md`: `buildCandidate()` seeds a snake-draft starting point (keepers
spread across teams first, then strongest-first draft with jitter), then
`optimise()` hill-climbs by trying every pairwise cross-team swap for up to
40 passes, keeping only strictly-improving swaps, across `restarts` (default
120) independent random starts — the best of all restarts wins. The penalty
combines ability-spread (stddev × team-average, weight 4), goalkeeper gaps
(weight 10, but only "avoidable" ones — a genuine shortage of keepers is
excluded so the score doesn't unfairly punish an unwinnable situation),
positional shape imbalance (weight 6), and preference violation (weight 3),
plus an optional novelty term (weight 8) that only activates when
`previousAssignment` is supplied — this is what makes "Regenerate" (in
`prepareTeamsForSession`, which always passes the existing arrangement back
in when one exists) produce a genuinely different split rather than
reconverging on the same optimum.

## 6. Session state machine

`lib/sessions/state.ts` is the single source of truth for what
`sessions.status` transitions are legal — no server action calls
`.update({ status: ... })` without going through
`assertTransition(from, to)` first (checked in `admin-sessions.ts`'s
`setSessionStatusAction` and both team-publish actions in
`admin-teams.ts`). It is a plain adjacency map, `ALLOWED_TRANSITIONS`, keyed
by the 8-value `session_status` enum:

```
draft ──────────► signup_open ──────────► signup_closed
  │                  │  ▲  │                  │  ▲
  │                  │  │  └──────────────────┘  │
  │                  │  └─────────────────────────┘
  └──────────────────┴────────────────┐
                                       ▼
cancelled ◄──── (from any status) ── teams_generated ◄──────┐
  │  │                                  │  ▲   │            │
  │  └──► draft                         │  │   ▼            │
  └─────► signup_open                   │  │  teams_published
                                         │  │      │  ▲   │
                                         │  └──────┘  │   │
                                         └─────────────┘   ▼
                                                       in_progress ──► completed
                                                            ▲──────────────┘
```

(`cancelled` is reachable from every non-terminal status; the diagram omits
those edges for legibility — see the table below for the exact set.)

| From | Allowed to |
| --- | --- |
| `draft` | `signup_open`, `cancelled` |
| `signup_open` | `signup_closed`, `teams_generated`, `draft`, `cancelled` |
| `signup_closed` | `teams_generated`, `signup_open`, `cancelled` |
| `teams_generated` | `teams_published`, `signup_closed`, `signup_open`, `cancelled` |
| `teams_published` | `in_progress`, `teams_generated`, `cancelled` |
| `in_progress` | `completed`, `teams_published`, `teams_generated`, `cancelled` |
| `completed` | `in_progress` |
| `cancelled` | `draft`, `signup_open` |

Two things worth noting about the shape of this graph, both explained in
code comments:
- **Teams can be generated while signup is still open** (`signup_open →
  teams_generated` is legal) — a deliberate consequence of the
  `20260918120000_signup_window.sql` migration moving the signup deadline to
  *after* kickoff. Closing signup is now an admin's choice, not a
  precondition for picking teams.
- **Almost every "forward" transition has a matching "backward" one**
  (`teams_published → teams_generated`, `in_progress → teams_generated`,
  `completed → in_progress`) — the state machine models a Sunday as
  something an organiser actively steers, including correcting a mistake
  discovered on the pitch, not a one-way pipeline.

Beyond `assertTransition`, `lib/sessions/state.ts` centralises every other
status-dependent rule the rest of the app reads rather than re-deriving:
`teamsVisible()` / `teamsAwaitingReveal()` (status *and* `teams_reveal_at`
must both agree before a player sees a team), `signupIsOpen()` /
`signupClosedReason()` (status *and* `signup_deadline`), and
`nextAdminAction()` (drives the "next thing to do" admin dashboard named in
the PRD). Every one of these is re-evaluated server-side at the point of
mutation — e.g. `setSignupAction` calls `signupIsOpen()` itself rather than
trusting that the button was disabled in the browser.

## 7. Deviations found

- **Password reset writes directly from the browser** (§2) — the one
  intentional exception to "every write is a server action," and it writes
  to Supabase's own `auth.users`, not the RLS-governed `public.*` schema, so
  it does not weaken the "no anon-key writes to app data" guarantee.
- **The cron route is a Route Handler, not a Server Action** — a deliberate
  and reasonable difference (a scheduled job has no form to submit), but
  worth naming: it authorises itself with a bearer-token comparison against
  `process.env.CRON_SECRET` rather than `requireAdmin()`, and that check is
  skipped entirely if `CRON_SECRET` is unset. It still only ever calls
  `supabaseAdmin()` server-side, so it does not violate the RLS model, but
  an unset `CRON_SECRET` in production would leave `/api/cron/prepare-sunday`
  world-callable (it can only *generate and publish teams* for sessions
  already eligible by the code's own rules — it can't be used to read
  private data or escalate a role — but it is still an unauthenticated
  trigger for a write).
- No other deviation from the stated rules was found: every other write
  path traced back to a `"use server"` action or the cron route, all of
  which call one of the three `require*` guards (or, for the cron route,
  the bearer-token check) before touching `supabaseAdmin()`.
