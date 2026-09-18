/**
 * Fills the Supabase keys into .env.local by asking for them, so nothing has to
 * be edited by hand. Run it with: npm run setup
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
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
Open your API keys page:
  https://supabase.com/dashboard/project/nnchomuinlcklzzfvptc/settings/api-keys

Stay on the "Publishable and secret API keys" tab.
`);

const publishable = (await rl.question("1. Paste the PUBLISHABLE key (sb_publishable_...)\n   > ")).trim();
const secret = (await rl.question("\n2. Click the eye icon on the SECRET key, copy it, paste here (sb_secret_...)\n   > ")).trim();

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
contents = set(contents, "NEXT_PUBLIC_SUPABASE_ANON_KEY", publishable);
contents = set(contents, "SUPABASE_SERVICE_ROLE_KEY", secret);
writeFileSync(FILE, contents);

console.log("\nSaved to .env.local. Tell Claude you're done.\n");
