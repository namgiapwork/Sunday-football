/**
 * Applies the migrations (and optionally the seed) to any Postgres, including a
 * Supabase project. Every schema change lives in supabase/migrations and is
 * replayable from scratch (spec §50).
 *
 *   npm run db:migrate
 *   npm run db:seed
 *   npm run db:reset     -- drops the public schema first. Never in production.
 *
 * Reads DATABASE_URL from the environment or .env.local. In Supabase this is
 * Project settings → Database → Connection string → URI.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const SEED_FILE = join(process.cwd(), "supabase", "seed.sql");

type Command = "migrate" | "seed" | "reset";

async function main() {
  const command = (process.argv[2] ?? "migrate") as Command;
  if (!["migrate", "seed", "reset"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use migrate, seed or reset.`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local — in Supabase it is under " +
        "Project settings → Database → Connection string → URI.",
    );
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    if (command === "reset") {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to reset: NODE_ENV is production.");
      }
      console.log("Dropping the public schema…");
      await client.query("drop schema public cascade; create schema public;");
      await client.query("grant usage on schema public to anon, authenticated, service_role;");
    }

    if (command === "migrate" || command === "reset") {
      for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
        if (!file.endsWith(".sql")) continue;
        console.log(`Applying ${file}…`);
        await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      }
    }

    if (command === "seed" || command === "reset") {
      console.log("Seeding…");
      await client.query(readFileSync(SEED_FILE, "utf8"));
    }

    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
