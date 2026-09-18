/**
 * Stores a Supabase personal access token in .supabase-token (gitignored) so
 * migrations can be applied without the dashboard SQL editor.
 * Run it with: npm run setup:supabase
 */
import { writeFileSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

console.log(`
Create a token here:
  https://supabase.com/dashboard/account/tokens

  - "Generate new token", name it e.g. "sunday-football migrations"
  - Copy it straight away; Supabase shows it once

This is an account token, separate from the project API keys.
`);

const token = (await rl.question("Paste the token\n   > ")).trim();
rl.close();

if (!token) {
  console.error("\nNothing was saved: the token is empty.");
  process.exit(1);
}
if (!token.startsWith("sbp_")) {
  console.error("\nNothing was saved: a personal access token starts with sbp_.");
  process.exit(1);
}
if (token.length < 30) {
  console.error(`\nNothing was saved: only ${token.length} characters, so it looks cut off.`);
  process.exit(1);
}

writeFileSync(".supabase-token", `${token}\n`, { mode: 0o600 });
chmodSync(".supabase-token", 0o600);

console.log("\nSaved to .supabase-token. Tell Claude you're done.\n");
