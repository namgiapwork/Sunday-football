# Deploying to Vercel with a token

A token lets you deploy from the terminal without a browser login. The token is a
password for your Vercel account: keep it in `.vercel-token`, which is gitignored,
and never paste it into a commit, chat or screenshot.

## One-time setup

1. **Create a token** at <https://vercel.com/account/tokens>. Name it something like
   "sunday-football deploy", scope it to your own account, and copy it straight
   away, because Vercel shows it only once.
2. **Save it locally:**
   ```bash
   npm run setup:vercel
   ```
   Paste the token when asked. It is written to `.vercel-token` (permissions
   `600`).
3. **Check it is ignored by git:**
   ```bash
   git check-ignore .vercel-token
   ```
   This should print `.vercel-token`. If it prints nothing, add the file to
   `.gitignore` before doing anything else.
4. The project is already linked through `.vercel/project.json` (also gitignored).
   If you clone the repo somewhere new, run
   `npx vercel link --token "$(tr -d '[:space:]' < .vercel-token)"` once.
5. Optional: 
- Check who the token belongs to: `npx vercel whoami --token "$(tr -d '[:space:]' < .vercel-token)"`
- Check the status of that deplyment: `npx vercel inspect https://sunday-football-7evma943v-namgiapwork.vercel.app --logs --token "$(tr -d '[:space:]' < .vercel-token)"`
- Check the status of recent deployments: `npx vercel ls --token "$(tr -d '[:space:]' < .vercel-token)"`

## Every deploy

1. **Check the code first:**
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
2. **Commit and push**, so Vercel and git agree on what is live:
   ```bash
   git add -A && git commit -m "your message" && git push
   ```
3. **Deploy to production:**
   ```bash
   npx vercel deploy --prod --token "$(tr -d '[:space:]' < .vercel-token)"
   ```
4. **Confirm it:** open the Vercel dashboard, go to **Deployments**, and check the
   top production entry is the one you just made and shows *Ready*. Then hard
   refresh the site, or close and reopen the home-screen app, because browsers
   cache the old page.

## Why the site can show old code

- `vercel deploy` uploads **the files in your folder at that moment**, not what is
  in git. Save and commit everything *before* you run it, and run it again after
  any later change.
- If the project is connected to GitHub, every push to `main` also triggers a
  deploy. Whichever deploy finishes last becomes production, so a slower older one
  can overwrite a newer one. Check the Deployments list if the site looks stale.
- A preview deploy (no `--prod`) never changes the live site.

## Database changes

Deploying does **not** touch the database. If you added a file to
`supabase/migrations/`, apply it separately, and only that file. `npm run
db:migrate` replays every migration from the start and stops at the first one that
already exists. Run the new file in the Supabase SQL editor instead.

## Other notes

- Environment variables and auth redirect URLs live in the Vercel and Supabase
  dashboards, not in this repo. See `DEPLOYMENT.md` for the full list.
- To stop the token working, delete it at
  <https://vercel.com/account/tokens> and remove `.vercel-token`.
