/**
 * Stores a Vercel access token in .vercel-token (gitignored) so deploys can run
 * without an interactive browser login. Run it with: npm run setup:vercel
 */
import { writeFileSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

console.log(`
Create a token here:
  https://vercel.com/account/tokens

  - Name it anything, e.g. "sunday-football deploy"
  - Scope: your own account
  - Expiration: whatever you like

Copy it as soon as it appears — Vercel shows it only once.
`);

const token = (await rl.question("Paste the token\n   > ")).trim();
rl.close();

if (!token) {
  console.error("\nNothing was saved: the token is empty.");
  process.exit(1);
}
if (token.length < 20) {
  console.error(`\nNothing was saved: that is only ${token.length} characters, so it looks cut off.`);
  process.exit(1);
}

writeFileSync(".vercel-token", `${token}\n`, { mode: 0o600 });
chmodSync(".vercel-token", 0o600);

console.log("\nSaved to .vercel-token. Tell Claude you're done.\n");
