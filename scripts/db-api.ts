/**
 * Applies migrations through the Supabase Management API, so no database
 * password or direct connection is needed.
 *
 *   npm run db:apply                 apply everything not yet applied
 *   npm run db:apply -- --status     show what is applied and what is pending
 *   npm run db:apply -- --baseline 20260918090200
 *                                    record migrations up to and including that
 *                                    version as already applied, without running
 *                                    them (for a database set up by hand)
 *
 * Reads .supabase-token and NEXT_PUBLIC_SUPABASE_URL.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const TOKEN_FILE = ".supabase-token";

function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\./);
  if (!match) throw new Error(`Cannot read a project ref from ${url}`);
  return match[1];
}

function token(): string {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(`${TOKEN_FILE} is missing. Run: npm run setup:supabase`);
  }
  return readFileSync(TOKEN_FILE, "utf8").trim();
}

async function run(sql: string): Promise<unknown[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef()}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase API ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}

const version = (file: string) => file.split("_")[0];

async function ensureLedger() {
  await run(`
    create table if not exists schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const rows = (await run("select version from schema_migrations order by version")) as { version: string }[];
  return new Set(rows.map((r) => r.version));
}

async function main() {
  const args = process.argv.slice(2);
  await ensureLedger();

  const files = migrationFiles();
  const done = await applied();

  if (args.includes("--status")) {
    for (const file of files) {
      console.log(`  ${done.has(version(file)) ? "applied" : "PENDING"}  ${file}`);
    }
    return;
  }

  const baselineIndex = args.indexOf("--baseline");
  if (baselineIndex !== -1) {
    const upTo = args[baselineIndex + 1];
    if (!upTo) throw new Error("--baseline needs a version, e.g. --baseline 20260918090200");

    const toRecord = files.filter((f) => version(f) <= upTo && !done.has(version(f)));
    for (const file of toRecord) {
      await run(
        `insert into schema_migrations (version, name) values ('${version(file)}', '${file}') on conflict do nothing;`,
      );
      console.log(`  recorded (not run)  ${file}`);
    }
    if (toRecord.length === 0) console.log("  nothing to record");
    return;
  }

  const pending = files.filter((f) => !done.has(version(f)));
  if (pending.length === 0) {
    console.log("  Up to date.");
    return;
  }

  for (const file of pending) {
    console.log(`  applying ${file}…`);
    await run(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    await run(
      `insert into schema_migrations (version, name) values ('${version(file)}', '${file}') on conflict do nothing;`,
    );
  }
  console.log(`  Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
