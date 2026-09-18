/**
 * Stores a GitHub token in .github-token (gitignored) so the repository can be
 * created and pushed to. Run it with: npm run setup:github
 */
import { writeFileSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

console.log(`
Create a token here:
  https://github.com/settings/tokens/new

  - Note: "sunday-football"
  - Expiration: whatever you like
  - Tick the "repo" checkbox (the top-level one)

Then "Generate token" and copy it — GitHub shows it once.
`);

const token = (await rl.question("Paste the token\n   > ")).trim();
rl.close();

if (!token) {
  console.error("\nNothing was saved: the token is empty.");
  process.exit(1);
}
if (!/^(ghp_|github_pat_)/.test(token)) {
  console.error("\nNothing was saved: a GitHub token starts with ghp_ or github_pat_.");
  process.exit(1);
}

writeFileSync(".github-token", `${token}\n`, { mode: 0o600 });
chmodSync(".github-token", 0o600);

console.log("\nSaved to .github-token. Tell Claude you're done.\n");
