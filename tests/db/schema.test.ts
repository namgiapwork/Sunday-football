import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, SEED_PAST_SESSION_ID, SEED_UPCOMING_SESSION_ID } from "../helpers/pg";

describe("schema", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  it("rejects a preference rank used twice by the same player", async () => {
    await db.exec(`insert into players (id, name) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Dup')`);
    await db.exec(`
      insert into player_positions (player_id, position, preference_rank, self_rating)
      values ('aaaaaaaa-0000-4000-8000-000000000001', 'CM', 1, 8)
    `);
    await expect(
      db.exec(`
        insert into player_positions (player_id, position, preference_rank, self_rating)
        values ('aaaaaaaa-0000-4000-8000-000000000001', 'AM', 1, 7)
      `),
    ).rejects.toThrow();
  });

  it("rejects a rating outside 1-10", async () => {
    await expect(
      db.exec(`
        insert into player_positions (player_id, position, preference_rank, self_rating)
        values ('aaaaaaaa-0000-4000-8000-000000000001', 'ST', 2, 11)
      `),
    ).rejects.toThrow();
  });

  it("derives effective_rating from the self rating until a calculated one exists", async () => {
    const before = await db.query<{ effective_rating: string }>(
      `select effective_rating from player_positions where player_id = 'aaaaaaaa-0000-4000-8000-000000000001' and position = 'CM'`,
    );
    expect(Number(before.rows[0].effective_rating)).toBe(8);

    await db.exec(
      `update player_positions set calculated_rating = 6.5 where player_id = 'aaaaaaaa-0000-4000-8000-000000000001' and position = 'CM'`,
    );
    const after = await db.query<{ effective_rating: string }>(
      `select effective_rating from player_positions where player_id = 'aaaaaaaa-0000-4000-8000-000000000001' and position = 'CM'`,
    );
    expect(Number(after.rows[0].effective_rating)).toBe(6.5);
  });
});

describe("seeded database", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ seed: true });
  });

  afterAll(async () => {
    await db.close();
  });

  async function count(sql: string) {
    const r = await db.query<{ c: number }>(sql);
    return Number(r.rows[0].c);
  }

  it("creates 35 players, each with 1-3 ranked positions", async () => {
    expect(await count("select count(*) c from players")).toBe(35);
    const ranks = await db.query<{ c: number }>(`
      select count(*) c from (
        select player_id from player_positions group by player_id having count(*) between 1 and 3
      ) x
    `);
    expect(Number(ranks.rows[0].c)).toBe(35);
  });

  it("includes enough goalkeeper-capable players to cover four teams", async () => {
    const gks = await count(`select count(distinct player_id) c from player_positions where position = 'GK'`);
    expect(gks).toBeGreaterThanOrEqual(4);
    expect(gks).toBeLessThanOrEqual(6);
  });

  it("stores PINs as bcrypt hashes, never in the clear", async () => {
    const r = await db.query<{ pin_hash: string }>("select pin_hash from player_credentials limit 1");
    expect(r.rows[0].pin_hash).toMatch(/^\$2[aby]\$/);
    expect(await count("select count(*) c from player_credentials where pin_hash = '1234'")).toBe(0);
  });

  it("splits the completed Sunday into four published teams of seven", async () => {
    const sizes = await db.query<{ c: number }>(`
      select count(*) c from team_members where session_id = '${SEED_PAST_SESSION_ID}' group by team_id
    `);
    expect(sizes.rows.map((r) => Number(r.c))).toEqual([7, 7, 7, 7]);
  });

  it("gives every completed team a goalkeeper-capable player", async () => {
    const r = await db.query<{ c: number }>(`
      select count(distinct tm.team_id) c
      from team_members tm
      join player_positions pp on pp.player_id = tm.player_id and pp.position = 'GK'
      where tm.session_id = '${SEED_PAST_SESSION_ID}'
    `);
    expect(Number(r.rows[0].c)).toBe(4);
  });

  it("records six completed matches with goals credited to players on the scoring team", async () => {
    expect(await count(`select count(*) c from matches where status = 'completed'`)).toBe(6);
    expect(await count("select count(*) c from match_events")).toBeGreaterThan(0);

    const orphans = await count(`
      select count(*) c
      from match_events e
      left join team_members tm on tm.team_id = e.team_id and tm.player_id = e.player_id
      where e.player_id is not null and tm.id is null
    `);
    expect(orphans).toBe(0);

    const badAssists = await count(`
      select count(*) c
      from match_events e
      left join team_members tm on tm.team_id = e.team_id and tm.player_id = e.assist_player_id
      where e.assist_player_id is not null and tm.id is null
    `);
    expect(badAssists).toBe(0);
  });

  it("has an upcoming Sunday open for signup with a realistic spread", async () => {
    const r = await db.query<{ status: string; c: number }>(`
      select status::text, count(*) c from signups
      where session_id = '${SEED_UPCOMING_SESSION_ID}' group by status order by 1
    `);
    expect(Object.fromEntries(r.rows.map((x) => [x.status, Number(x.c)]))).toEqual({
      confirmed: 24,
      declined: 5,
      maybe: 3,
    });
  });
});

describe("integrity rules", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ seed: true });
  });

  afterAll(async () => {
    await db.close();
  });

  it("refuses a second signup for the same player and session", async () => {
    await expect(
      db.exec(`
        insert into signups (session_id, player_id, status)
        values ('${SEED_UPCOMING_SESSION_ID}', '33333333-3333-4333-8333-000000000001', 'declined')
      `),
    ).rejects.toThrow();
  });

  it("keeps lineup slots to 0-7, one player per slot, and lets any number be unset", async () => {
    const team = "55555555-5555-4555-8555-000000000001";
    const ids = (
      await db.query<{ id: string }>(`select id from team_members where team_id = '${team}' order by id limit 2`)
    ).rows.map((r) => r.id);

    // Unset is fine for everyone, which is how existing rows look.
    await db.exec(`update team_members set lineup_slot = null where team_id = '${team}'`);

    await db.exec(`update team_members set lineup_slot = 3 where id = '${ids[0]}'`);
    await expect(db.exec(`update team_members set lineup_slot = 3 where id = '${ids[1]}'`)).rejects.toThrow();
    await expect(db.exec(`update team_members set lineup_slot = 8 where id = '${ids[1]}'`)).rejects.toThrow();
  });

  it("refuses to put a player on two teams in the same Sunday", async () => {
    await expect(
      db.exec(`
        insert into team_members (team_id, session_id, player_id, assigned_position)
        values ('55555555-5555-4555-8555-000000000002', '${SEED_PAST_SESSION_ID}',
                (select player_id from team_members where team_id = '55555555-5555-4555-8555-000000000001' limit 1),
                'CM')
      `),
    ).rejects.toThrow();
  });

  it("refuses a team from another Sunday as a match opponent", async () => {
    await db.exec(`
      insert into teams (id, session_id, name, colour, display_order, published)
      values ('77777777-7777-4777-8777-000000000001', '${SEED_UPCOMING_SESSION_ID}', 'Red', 'red', 0, false)
    `);
    await expect(
      db.exec(`
        insert into matches (session_id, team_a_id, team_b_id, scheduled_order)
        values ('${SEED_PAST_SESSION_ID}', '55555555-5555-4555-8555-000000000001',
                '77777777-7777-4777-8777-000000000001', 99)
      `),
    ).rejects.toThrow();
  });

  it("refuses a match against itself", async () => {
    await expect(
      db.exec(`
        insert into matches (session_id, team_a_id, team_b_id, scheduled_order)
        values ('${SEED_PAST_SESSION_ID}', '55555555-5555-4555-8555-000000000001',
                '55555555-5555-4555-8555-000000000001', 98)
      `),
    ).rejects.toThrow();
  });

  it("refuses an assist credited to the scorer", async () => {
    await expect(
      db.exec(`
        insert into match_events (match_id, session_id, team_id, player_id, assist_player_id)
        select m.id, m.session_id, m.team_a_id, tm.player_id, tm.player_id
        from matches m
        join team_members tm on tm.team_id = m.team_a_id
        where m.session_id = '${SEED_PAST_SESSION_ID}'
        limit 1
      `),
    ).rejects.toThrow();
  });

  it("cancels only with a reason", async () => {
    await expect(
      db.exec(`update sessions set status = 'cancelled' where id = '${SEED_UPCOMING_SESSION_ID}'`),
    ).rejects.toThrow();
    await db.exec(`
      update sessions set status = 'cancelled', cancellation_reason = 'Pitch flooded'
      where id = '${SEED_UPCOMING_SESSION_ID}'
    `);
  });
});

describe("admin auth linking", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb({ seed: true });
  });

  afterAll(async () => {
    await db.close();
  });

  it("links a new Supabase Auth user to the player with that email", async () => {
    await db.exec(
      `insert into auth.users (id, email) values ('99999999-9999-4999-8999-000000000001', 'Khoi@Example.com')`,
    );

    const r = await db.query<{ name: string }>(
      `select name from players where auth_user_id = '99999999-9999-4999-8999-000000000001'`,
    );
    expect(r.rows.map((x) => x.name)).toEqual(["Khoi"]);
  });

  it("ignores an auth user whose email nobody plays under", async () => {
    await db.exec(
      `insert into auth.users (id, email) values ('99999999-9999-4999-8999-000000000002', 'stranger@example.com')`,
    );

    const r = await db.query<{ c: number }>(
      `select count(*) c from players where auth_user_id = '99999999-9999-4999-8999-000000000002'`,
    );
    expect(Number(r.rows[0].c)).toBe(0);
  });

  it("does not steal a player who is already linked", async () => {
    await db.exec(
      `insert into auth.users (id, email) values ('99999999-9999-4999-8999-000000000003', 'khoi@example.com')`,
    );

    const r = await db.query<{ auth_user_id: string }>(
      `select auth_user_id from players where name = 'Khoi'`,
    );
    expect(r.rows[0].auth_user_id).toBe("99999999-9999-4999-8999-000000000001");
  });
});
