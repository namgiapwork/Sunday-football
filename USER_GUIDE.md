# Sunday Football — User Guide

A walkthrough of the app as it actually works, for the people using it —
players, scorekeepers, and admins. If you're an engineer or an AI agent
looking for how the code is put together, this isn't that file — see
`README.md`, `ARCHITECTURE.md`, and `CLAUDE.md` instead.

The whole app follows one cycle: **sign up for a Sunday → the organisers
pick and publish teams → you find out which team you're on → you play.**

---

## Players

### Signing in

Open the app and you land on the sign-in screen.

- **You've played before:** type your name into the "Select your name" box,
  tap yourself in the list that appears, then enter your 4-digit PIN on the
  number pad and tap **Continue**.
- **First time:** tap **I'm new** at the bottom. On the "Join the group"
  screen you'll: type the name you want to be known as, choose a 4-digit
  PIN, and (optionally) pick up to three positions you like to play, ranked
  first/second/third choice, each with a slider rating yourself 1–10. Tap
  **Join** and you're straight in — no separate confirmation step.
- **Forgotten your PIN:** there's no "forgot PIN" link on the sign-in
  screen itself — the app tells you this up front on the Join screen ("An
  admin can reset it if you forget"). Message one of the organisers and ask
  them to reset it from their Players page; they'll give you a new one to
  sign in with.

Once you're in, you generally stay signed in for weeks — you won't be asked
to log in again every time you open the app.

### The bottom navigation

Four tabs, always visible at the bottom of the screen: **Home**, **Teams**,
**Profile**, and — only if you're an admin — **Admin**.

#### 1. Home

The screen you land on after signing in: *"Which Sundays are you playing?"*
This is where the app differs from a typical one-week sign-up sheet — **it
shows up to the next four Sundays at once**, not just the nearest one, so
you can answer several weeks in one sitting if you already know your plans.
The nearest Sunday gets the big, prominent card; the rest are shown more
compactly underneath. A line at the bottom confirms this: *"Showing the
next N Sundays. Answer for as many as you like."*

Each Sunday's card shows the date, kickoff time, venue, and a live headcount
("X playing") with the faces of everyone confirmed so far — this updates in
real time if you leave the screen open while others are signing up. Three
buttons let you answer: **I'm in**, **Maybe**, **Can't**. Whichever you tap
is saved instantly — there's no separate "submit."

If the organisers have already published teams for that Sunday and it's
past the reveal time, a green **Teams are ready →** banner appears on that
card instead, linking straight to the Teams tab. If they've picked teams
but it's not reveal time yet, you'll see a note like *"Teams are picked —
they go up [time]"* instead of hiding it completely.

If signup has closed for a Sunday (see below), the three buttons are
replaced with a plain sentence explaining why — e.g. *"The organisers have
closed signup"* or *"Signup has not opened yet."*

Tapping anywhere on a card other than the answer buttons opens that
Sunday's own page (see below).

**One thing worth knowing:** signup for a Sunday doesn't actually close
until the day *after* the game (by default, the following Monday night) —
not before kickoff. So if your plans changed at the last minute, or you
meant to say yes and forgot, you can still fix your answer after the fact,
including the morning after if you signed up but didn't actually show up,
or vice versa. The "Closes [date]" line under each card tells you exactly
when your window shuts for that specific Sunday.

#### 2. A Sunday's own page (`/sunday/…`)

Reached by tapping a card on Home. Same idea as the Home card but roomier:
a big **I'M PLAYING** button (or, if you've already said yes, a green
confirmation with *"Change your mind below if something comes up"*), plus
**Maybe** / **Can't play**. Below that, four lists you can scroll through —
**Playing**, **Maybe**, **Can't play**, **No answer yet** — each showing
names and photos. Tap any name to see that person's public profile page.
If the venue has a maps link, there's an **Open in Maps** button near the
top.

If the Sunday has been cancelled, none of this shows — just the reason the
organisers gave.

#### 3. Teams

Shows whichever Sunday is "current" (the next one that hasn't finished).
What you see depends on where that Sunday is in the process:
- **Not picked yet:** *"Teams are not ready yet. They appear here as soon
  as the organisers have picked them."*
- **Picked but not revealed:** *"Teams are picked. They go up [time] —
  check back then."*
- **Revealed:** your own team is shown first, highlighted, under a heading
  like *"You're on 🔵 Blue"* — then every other team below it. If you
  signed up after the teams were already built, you'll see a **Waiting to
  be placed** list instead of a team — the organisers will slot you in by
  hand without reshuffling anyone else.

#### 4. Profile

Your own settings: change your photo, your display name, your position
preferences (identical picker to the Join screen — up to three positions,
ranked, each with a 1–10 self-rating slider), and your PIN (you'll need
your current PIN plus your new one twice). A **Sign out** button sits at
the bottom.

The page says exactly what a rating change does and doesn't affect: *"Your
positions and ratings are used whenever teams get picked next — including
this Sunday, if the teams are not out yet. Teams that have already gone up
keep the ratings they were picked with."* In other words, editing your
profile never changes a team sheet that's already been generated.

#### A player's public profile (`/player/[id]`)

Reached by tapping a name anywhere in the app. Shows their photo, name, a
role badge if they're a scorekeeper or admin, a "No longer playing" note if
they've been deactivated, and their preferred positions — **but not a
rating number next to those positions**, unless it's your own profile.

### What you can never see, and why

- **Other players' ratings.** You can see your own self-rating (you set
  it), and an admin can see anyone's, but you will never see another
  player's numbers anywhere in the app — not on their profile, not on a
  team sheet. The Profile screen says why up front: *"Only you and the
  organisers see these ratings. They are used to balance the teams —
  nobody else in the group sees your numbers."* This is deliberate, not a
  missing feature — it keeps the balancing honest without turning it into
  a public leaderboard.
- **Teams before they're ready.** Teams go through two separate gates
  before you see them: the organisers have to *publish* them (decide
  they're final), and the *reveal time* has to arrive (by default, Friday
  night before the Sunday). Publishing early and revealing later is
  intentional — it lets organisers finish their work in peace without the
  team sheet leaking days ahead of the game.

---

## Admins and scorekeepers

### Signing in as an admin

Admins use a **completely different sign-in**: email and password at
`/admin-login`, not the PIN screen. The screen says so directly: *"Running
a Sunday needs the email login, not a 4-digit PIN."* There's a **Forgotten
your password?** link that emails you a reset link, and a **Player sign
in** link back to the normal PIN screen if you got there by mistake.

An admin account has to be set up for you first (an existing admin or a
direct Supabase dashboard action links your email to your player profile —
see `README.md` if you're setting up the first one). You can't upgrade
yourself to admin from inside the app under any circumstances — not even
by knowing someone else's password. A PIN sign-in can never reach the admin
area, full stop.

### What a scorekeeper can actually do today

Worth being direct about this: **a "Scorekeeper" is currently just a
label.** Setting someone's role to Scorekeeper (from the Players page)
shows a small badge on their public profile, and that's the entire
difference from a regular player right now — they sign in with the same
PIN, see the same Home/Teams/Profile screens, and cannot reach anything
under the Admin tab. The role exists for a match-scoring feature (recording
goals during a game) that's designed into the database already but hasn't
shipped as a screen yet. Don't expect a scorekeeper to be able to do
anything a player can't, yet.

### The admin navigation bar

A top bar with five tabs: **Sunday**, **Players**, **Attendance**,
**Settings**, and **Player view** (jumps you back to the normal player app,
useful for checking what players actually see).

#### Sunday (the dashboard, `/admin`)

Your home screen as an organiser — it always tells you the one next thing
to do. At the top: the next Sunday's date, time, venue, and a status pill
(Draft / Signup open / Signup closed / Teams generated / Teams published /
Match day / Completed / Cancelled). Below that:

- A **Signup** card with live counts — Confirmed, Maybe, Out, No reply —
  and when signup closes.
- A **Preparation** checklist with a tick or a hollow circle next to
  *Signup opened*, *Signup closed*, *N teams generated*, *Teams published*
  — a running scoreboard of where this Sunday stands.
- One big primary button that's always the single next sensible action:
  **Open signup** → **Close signup** → **Generate teams** → **Review and
  publish** → **Start match day** → **Complete Sunday**. You never have to
  guess what to do next; the app decides which button to show.
- Below that, secondary buttons: **Manage Sunday**, **Teams**, **Players**.
- At the bottom, an **Upcoming Sundays** section with a **Create the next 4
  Sundays** button — since players can answer up to four weeks ahead, it's
  worth keeping that list topped up — plus an **Or create one by hand**
  link if you want to set one up with different details.

If nothing is scheduled at all yet, this page is just a **Create Sunday**
button.

#### Manage Sunday (`/admin/session/[id]`, via "Manage Sunday")

The detail page for one specific Sunday: attendance numbers again, plus the
list of who's confirmed. A **Team generator** button jumps to team-picking
(below). Next to it, a row of **Move to [status]** buttons — every status
this Sunday is currently allowed to move to (the app only shows moves that
make sense; you can't, say, jump straight from Draft to Published). Moving
"backwards" — e.g. **Move to draft**, **Move to signup open** from a later
stage — is just as valid a button here as moving forward, for correcting a
mistake.

Below that, an editable form for the Sunday itself: **Date**, **Start** /
**End** time, **Venue**, a free-text **Pitch or note for this week** (for a
one-off change, like "Pitch 5 this week"), **Signup closes** (date and
time), and a **Message to players** box. Tap **Save Sunday** (or **Create
Sunday** if this is a new one).

At the bottom, unless the Sunday is already cancelled or completed: a
**Cancel this Sunday** section. You must type a reason (e.g. "Pitch closed
because of weather") before **Cancel Sunday** is enabled — it asks you to
confirm, and every player will immediately see that reason wherever the
Sunday appears for them.

#### Team generator (`/admin/session/[id]/teams`, via "Teams")

This is the core admin task, end to end:

1. **Generate.** If teams haven't been made yet, you'll see **How many
   teams?** as a row of buttons (the app suggests one, marked
   "suggested"), a **Balancing** panel with four toggles all on by default
   — *Balance ability*, *Balance position coverage*, *Respect preferred
   positions*, *Spread goalkeepers* — and a **Generate teams** button.
   Tap it and the balanced split appears below. If you're not happy with
   the arrangement, the same button becomes **Regenerate teams** — tapping
   it again produces a genuinely different split, not the same one
   repeated. This works whether signup is technically still open or not;
   you don't have to close signup first to start picking teams.
2. **Fine-tune.** Under *"Teams — tap a player to move them,"* every team
   is listed with its players. Tap anyone to open their actions: **Move
   to** another team (one tap), a **Position on Sunday** dropdown plus
   **Set** (change what they're playing without touching their saved
   preferences), **Mark as dropped out** / **Mark as playing again**
   (for someone who pulls out after teams are made — they stay visible on
   the sheet, just greyed out), and **Take off team sheet** (removes them
   entirely, with a confirmation prompt — their signup itself isn't
   touched, just their placement).
   If anyone signed up *after* you generated teams, they show up in a
   yellow **[N] signed up after the teams were picked** banner — tap their
   name, then a team, to slot them straight in without disturbing anyone
   else.
3. **Publish.** A **Publish teams** button, with a note underneath: *"Until
   you publish, only organisers can see these teams."* Once published, this
   becomes **Hide from players again** if you need to pull them back for
   more edits.
4. **Reveal.** Once published, a separate section controls *when* players
   actually see the team sheet — publishing and revealing are two
   different things on purpose. You'll see either *"Players can see the
   teams"* (if the reveal time has passed) or *"Players see the teams
   [time]. Until then only organisers can"* — with a button to **Reveal
   now** (jump the gun) or **Put reveal back to the usual time** (undo
   that).
5. **Share.** A plain-text version of the team sheet, ready to paste into
   Messenger or wherever your group actually talks, with **Copy** and
   (where your phone supports it) **Share** buttons.

#### Players (`/admin/players`)

A searchable list of everyone in the group. Tap a name to expand their
actions:
- Their saved ratings, if any (visible here since you're an admin).
- A **Role** dropdown — Player / Scorekeeper / Admin — plus **Set role**.
- **Reset PIN** — type a new 4-digit PIN for them and tap **Reset**. Do
  this whenever someone says they've forgotten theirs; there's no other
  way for them to recover access.
- **Remove picture**, if they have one set.
- **Deactivate** (or **Reactivate**, if they're currently inactive) and
  **Delete permanently** — see the caution below before using either.

#### Attendance (`/admin/attendance`)

A read-only grid: every active player down the side, the last 12 Sundays
across the top, and a mark in each cell — a filled dot for
played/in, a tilde for maybe, an × for out, a plain dot for no answer at
all. A **Played** column on the right only counts Sundays that actually
happened (not future "yes" answers), so it's a genuine record of who
showed up, not just who said they would.

#### Settings (`/admin/settings`)

Shows your group's defaults (name, timezone, usual kickoff time, usual
venue) as read-only reference — a new Sunday starts from these, and you
can override any of them per-Sunday when you create one. Below that, your
list of venues, and an **Add a venue** form (name, address, a maps link,
and notes) for adding a new one.

### Cautions — things with real consequences

- **Deactivate vs. Delete permanently, on the Players page, don't go by
  colour.** The button styling here is the opposite of what you'd expect:
  **Deactivate** is shown in red (it's the everyday action, used whenever
  someone stops playing regularly), while **Delete permanently** is styled
  plainly. Delete is the one that can't be undone — it only works at all
  for someone who has never played a single Sunday; anyone with real
  history gets refused automatically (the confirmation dialog says so:
  *"It is refused if they have ever played"*). For anyone who's actually
  played, Deactivate is always the right call — it removes them from
  future Sundays while keeping every Sunday they already played on record.
- **Moving a Sunday back to Draft hides it from players.** The buttons for
  moving a Sunday "backwards" (e.g. **Move to draft**) sit right next to
  the forward ones with no extra warning. A Sunday in Draft status doesn't
  appear on anyone's Home screen at all — use this only to correct a
  genuine mistake (like a Sunday created too early by accident), not as a
  way to "pause" one you still want people to see. Also worth knowing: if
  a Sunday still has its usual reveal time set when you pull it back to
  Draft, the app's own scheduled job can still pick and publish teams for
  it automatically overnight, even though you moved it back — check the
  dashboard the next morning if you ever do this.
- **Cancelling is the only way to "remove" a Sunday — there's no delete.**
  Cancel requires a reason, shows that reason to every player immediately,
  and is reversible (you can move a cancelled Sunday back to Draft or
  Signup open later). If you created a Sunday by mistake with nobody having
  signed up yet, cancelling it is still the only option — there's no way to
  erase it outright.
- **You can't accidentally lock yourself, or the group, out of admin
  access.** The app won't let you demote or deactivate the *last* remaining
  admin (including yourself) — those actions are refused with an
  explanation rather than silently succeeding.
