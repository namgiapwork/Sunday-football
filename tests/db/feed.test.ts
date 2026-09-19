import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, SEED_GROUP_ID } from "../helpers/pg";

let db: PGlite;
let playerId: string;

const insertFixture = (cols: string, vals: string) =>
  db.query(`insert into fixtures (group_id, kickoff_at, ${cols}) values ('${SEED_GROUP_ID}', now() + interval '1 day', ${vals}) returning id`);

beforeAll(async () => {
  db = await createTestDb({ seed: true });
  const { rows } = await db.query<{ id: string }>("select id from players limit 1");
  playerId = rows[0].id;
});
afterAll(async () => db.close());

describe("feed schema", () => {
  it("rejects identical teams, scores without finished, and half scores", async () => {
    await expect(insertFixture("home_team, away_team", "'Man City', 'man city'")).rejects.toThrow();
    await expect(insertFixture("home_team, away_team, home_goals, away_goals", "'A', 'B', 1, 0")).rejects.toThrow();
    await expect(insertFixture("home_team, away_team, status, home_goals", "'A', 'B', 'finished', 1")).rejects.toThrow();
    await expect(insertFixture("home_team, away_team, status", "'A', 'B', 'finished'")).rejects.toThrow();
  });

  it("accepts a scheduled fixture and a finished fixture with a score", async () => {
    await insertFixture("home_team, away_team", "'Man City', 'Sunderland'");
    await insertFixture("home_team, away_team, status, home_goals, away_goals", "'A', 'B', 'finished', 2, 2");
  });

  it("allows one prediction per player per fixture", async () => {
    const { rows } = await insertFixture("home_team, away_team", "'X', 'Y'");
    const fid = (rows[0] as { id: string }).id;
    const ins = `insert into fixture_predictions (fixture_id, player_id, pick) values ('${fid}', '${playerId}', 'home')`;
    await db.exec(ins);
    await expect(db.exec(ins)).rejects.toThrow();
  });

  it("locks predictions once the fixture has kicked off", async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into fixtures (group_id, kickoff_at, home_team, away_team)
       values ('${SEED_GROUP_ID}', now() - interval '1 hour', 'Late', 'Game') returning id`,
    );
    await expect(
      db.exec(`insert into fixture_predictions (fixture_id, player_id, pick) values ('${rows[0].id}', '${playerId}', 'draw')`),
    ).rejects.toThrow(/closed/);
  });

  it("requires a non-zero delta and a reason on stat adjustments", async () => {
    const base = `insert into player_stat_adjustments (group_id, player_id, stat, delta, reason) values ('${SEED_GROUP_ID}', '${playerId}', 'goal'`;
    await expect(db.exec(`${base}, 0, 'fix')`)).rejects.toThrow();
    await expect(db.exec(`${base}, 1, '')`)).rejects.toThrow();
    await db.exec(`${base}, 2, 'Missed goals from last season')`);
  });

  it("refuses to delete a player who has a prediction or adjustment", async () => {
    await expect(db.exec(`delete from players where id = '${playerId}'`)).rejects.toThrow();
  });

  it("gives the browser no access to predictions or adjustments, and no write access", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from fixture_predictions")).rejects.toThrow(/permission/);
      await expect(db.query("select * from player_stat_adjustments")).rejects.toThrow(/permission/);
      await expect(db.query("select external_id from fixtures")).rejects.toThrow(/permission/);
      await expect(db.query("select created_by from fixtures")).rejects.toThrow(/permission/);
      await expect(db.exec("update fixtures set home_team = 'x'")).rejects.toThrow(/permission/);
      await expect(db.exec("delete from fixtures")).rejects.toThrow(/permission/);
      await expect(db.exec(`insert into fixtures (group_id, kickoff_at, home_team, away_team) values ('${SEED_GROUP_ID}', now(), 'a', 'b')`)).rejects.toThrow();
      const { rows } = await db.query("select home_team from fixtures");
      expect(rows.length).toBeGreaterThan(0);
    } finally {
      await db.exec("reset role");
    }
  });
});
