/**
 * Fills the Supabase connection details into .env.local by asking for them, so
 * nothing has to be edited by hand. Run it with: npm run setup
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const FILE = ".env.local";

if (!existsSync(FILE)) copyFileSync(".env.example", FILE);

const rl = createInterface({ input: stdin, output: stdout });

function set(contents, key, value) {
  const line = `${key}=${value}`;
  return contents.match(new RegExp(`^${key}=.*$`, "m"))
    ? contents.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${contents.trimEnd()}\n${line}\n`;
}

console.log(`
Create a project at https://supabase.com/dashboard, then open it.

Its URL looks like:
  https://supabase.com/dashboard/project/abcdefghijklmnop
`);

const projectUrlOrRef = (await rl.question("1. Paste your project URL, or just its reference\n   > ")).trim();

// Accept a dashboard URL, an API URL, or a bare project reference.
const ref =
  projectUrlOrRef.match(/dashboard\/project\/([a-z0-9]+)/)?.[1] ??
  projectUrlOrRef.match(/^https:\/\/([a-z0-9]+)\.supabase\./)?.[1] ??
  (/^[a-z0-9]{16,}$/.test(projectUrlOrRef) ? projectUrlOrRef : null);

if (!ref) {
  console.error(
    "\nNothing was saved: that does not look like a Supabase project URL or reference.",
  );
  process.exit(1);
}

console.log(`
Project ${ref}. Now the API keys:
  https://supabase.com/dashboard/project/${ref}/settings/api-keys

Stay on the "Publishable and secret API keys" tab.
`);

const publishable = (await rl.question("2. Paste the PUBLISHABLE key (sb_publishable_...)\n   > ")).trim();
const secret = (await rl.question("\n3. Click the eye icon on the SECRET key, copy it, paste here (sb_secret_...)\n   > ")).trim();

rl.close();

const problems = [];
if (!publishable) problems.push("The publishable key is empty.");
if (!secret) problems.push("The secret key is empty.");
if (secret && secret === publishable) problems.push("Both keys are the same — one of them is the wrong one.");
if (publishable && !/^(sb_publishable_|eyJ)/.test(publishable)) {
  problems.push("The publishable key does not look right: it should start with sb_publishable_ or eyJ.");
}
if (secret && !/^(sb_secret_|eyJ)/.test(secret)) {
  problems.push("The secret key does not look right: it should start with sb_secret_ or eyJ.");
}
// A truncated copy of the masked preview is the usual mistake, so check length.
if (secret && secret.length < 30) {
  problems.push(
    `The secret key is only ${secret.length} characters, so it is the masked preview rather than the key. ` +
      "Click the eye icon to reveal it first, then the copy icon.",
  );
}
if (publishable && publishable.length < 30) {
  problems.push(`The publishable key is only ${publishable.length} characters — it looks cut off.`);
}

if (problems.length > 0) {
  console.error("\nNothing was saved:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

let contents = readFileSync(FILE, "utf8");
contents = set(contents, "NEXT_PUBLIC_SUPABASE_URL", `https://${ref}.supabase.co`);
contents = set(contents, "NEXT_PUBLIC_SUPABASE_ANON_KEY", publishable);
contents = set(contents, "SUPABASE_SERVICE_ROLE_KEY", secret);

// Generate the secrets rather than making anyone think one up.
if (!/^SESSION_SECRET=.+$/m.test(contents)) {
  contents = set(contents, "SESSION_SECRET", randomBytes(48).toString("base64"));
  console.log("\nGenerated a SESSION_SECRET for you.");
}
if (!/^CRON_SECRET=.+$/m.test(contents)) {
  contents = set(contents, "CRON_SECRET", randomBytes(32).toString("base64"));
  console.log("Generated a CRON_SECRET for you.");
}

writeFileSync(FILE, contents);

console.log(`
Saved to .env.local.

Next:
  npm run setup:supabase   store an account token so migrations can be applied
  npm run db:apply         create the tables
  npm run db:seed          add 35 demo players and a couple of Sundays
  npm run dev              http://localhost:3000 — every seeded player's PIN is 1234
`);
