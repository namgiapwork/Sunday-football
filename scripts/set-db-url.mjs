/**
 * Assembles DATABASE_URL from the Supabase connection string and your database
 * password, writing it straight into .env.local. The password is only ever held
 * by this script and that file. Run it with: npm run setup:db
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const FILE = ".env.local";
if (!existsSync(FILE)) copyFileSync(".env.example", FILE);

config({ path: FILE, quiet: true });

// Point at whichever project this checkout is configured for.
const ref =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/^https:\/\/([a-z0-9]+)\.supabase\./)?.[1] ??
  "<your-project-ref>";

const rl = createInterface({ input: stdin, output: stdout });

console.log(`
Open your database settings:
  https://supabase.com/dashboard/project/${ref}/settings/database

Under "Connection string", choose the SESSION POOLER tab and copy the URI.
It looks like:
  postgresql://postgres.${ref}:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
`);

const uri = (await rl.question("1. Paste the connection string\n   > ")).trim();
const password = (await rl.question("\n2. Your database password (set when you created the project)\n   > ")).trim();

rl.close();

const problems = [];
if (!/^postgres(ql)?:\/\//.test(uri)) problems.push("That does not look like a connection string — it should start with postgresql://");
if (!password) problems.push("The password is empty.");
if (/^\[.*\]$/.test(password)) problems.push("That is the placeholder, not your actual password.");

if (problems.length > 0) {
  console.error("\nNothing was saved:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

// Substitute the placeholder, or inject the password if the URI has none.
let url = uri.includes("[YOUR-PASSWORD]")
  ? uri.replace("[YOUR-PASSWORD]", encodeURIComponent(password))
  : uri.replace(/^(postgres(?:ql)?:\/\/[^:/@]+)(:[^@]*)?@/, `$1:${encodeURIComponent(password)}@`);

let contents = readFileSync(FILE, "utf8");
contents = contents.match(/^DATABASE_URL=.*$/m)
  ? contents.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`)
  : `${contents.trimEnd()}\nDATABASE_URL=${url}\n`;
writeFileSync(FILE, contents);

console.log("\nSaved to .env.local. Tell Claude you're done.\n");
