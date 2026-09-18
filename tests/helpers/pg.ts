import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const SEED_FILE = join(process.cwd(), "supabase", "seed.sql");

/**
 * Spins up a throwaway Postgres in WASM and applies the real migrations, so the
 * schema under test is exactly the one that ships. Supabase provides the auth
 * schema and the anon/authenticated/service_role roles; we stub them here.
 */
export async function createTestDb({ seed = false }: { seed?: boolean } = {}) {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema if not exists auth;
    create table auth.users (id uuid primary key, email text);
  `);

  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  if (seed) {
    await db.exec(readFileSync(SEED_FILE, "utf8"));
  }

  return db;
}

export const SEED_GROUP_ID = "11111111-1111-4111-8111-111111111111";
export const SEED_PAST_SESSION_ID = "44444444-4444-4444-8444-444444444441";
export const SEED_UPCOMING_SESSION_ID = "44444444-4444-4444-8444-444444444442";
