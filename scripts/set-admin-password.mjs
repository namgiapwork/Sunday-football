/**
 * Sets an organiser's password directly, for when the emailed reset link will
 * not cooperate. Run it with: npm run admin:password
 *
 * The password is typed here and sent straight to Supabase — it is never shown
 * on screen, never written to a file, and never leaves your machine except to
 * your own project.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const ENTER = ["\n", "\r", ""];
const CANCEL = "";
const BACKSPACE = "";

/** Reads a line without echoing it, so the password never appears on screen. */
function askHidden(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (char) => {
      if (ENTER.includes(char)) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === CANCEL) {
        stdout.write("\n");
        process.exit(1);
      } else if (char === BACKSPACE) {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };

    stdin.on("data", onData);
  });
}

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("Organiser email\n   > ")).trim();
rl.close();

if (!email) {
  console.error("\nNothing changed: no email given.");
  process.exit(1);
}

const listed = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, { headers });
if (!listed.ok) {
  console.error(`\nCould not reach Supabase: ${listed.status} ${await listed.text()}`);
  process.exit(1);
}

const { users } = await listed.json();
const user = users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

if (!user) {
  console.error(`\nNothing changed: no organiser account for ${email}.`);
  console.error(`Accounts that exist: ${users.map((u) => u.email).join(", ") || "none"}`);
  process.exit(1);
}

const password = await askHidden("New password (at least 8 characters, not shown as you type)\n   > ");
const again = await askHidden("Type it again\n   > ");

if (password.length < 8) {
  console.error("\nNothing changed: use at least 8 characters.");
  process.exit(1);
}
if (password !== again) {
  console.error("\nNothing changed: the two passwords did not match.");
  process.exit(1);
}

const updated = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ password, email_confirm: true }),
});

if (!updated.ok) {
  console.error(`\nSupabase refused it: ${updated.status} ${await updated.text()}`);
  process.exit(1);
}

console.log(`\nDone. Sign in at /admin-login as ${user.email} with the password you just set.\n`);
