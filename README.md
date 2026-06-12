# World Cup Intelligence Hub — Live + Historical

A FIFA World Cup analytics site with a **live match feed** for the 2026 tournament
plus a historical archive. Runs on Vercel: static frontend + serverless API
routes + a server-side cache that keeps you inside a free data quota.

## How the live feed works

```
football-data.org  ──>  your serverless routes  ──>  server-side cache  ──>  browser
   (your API key)        /api/cron/refresh (push)      live: 60s TTL          polls /api/live
                         /api/live (pull-through)       standings: 1h TTL       every 60s
```

Visitors never hit the data provider directly — they read your cache. That is what
lets many people watch a live match without burning your daily request quota.

There are two ways to keep the cache fresh; you can use either or both:

- **Pull-through (default, free).** When the cache expires, the next visitor's
  request to `/api/live` refreshes it. During a live match you have viewers, so
  data stays fresh on its own. Works on Vercel's free Hobby plan. No cron needed.
- **Cron push (always fresh).** A scheduler calls `/api/cron/refresh` on an
  interval so data is warm even with zero visitors. **Vercel Hobby allows crons
  only once per day**; per-minute refresh needs Vercel Pro ($20/mo) OR a free
  external scheduler (see below).

## Deploy in ~10 minutes

### 1. Get a data API key (free)
Register at https://www.football-data.org/client/register — no card required.
The free tier includes the World Cup (competition code `WC`) at 10 calls/minute.

### 2. Push this folder to a Git repo and import it on Vercel
- Create a new repo, commit these files, push to GitHub/GitLab.
- On https://vercel.com → **Add New Project** → import the repo.
- Framework preset: **Other**. Leave build settings empty (it's static + functions).

### 3. Add the environment variable
In the Vercel project → **Settings → Environment Variables**:
- `FOOTBALL_DATA_API_KEY` = your key from step 1.
Redeploy after adding it.

### 4. (Recommended) Add a persistent cache
Without this, each serverless instance keeps its own in-memory cache, so refreshes
aren't shared between them. To fix:
- Project → **Storage → Create Database → KV** (Upstash Redis).
- Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The code uses
  them automatically — no code change.

### 5. Choose your refresh strategy
- **Staying on Hobby (free):** the pull-through cache keeps data fresh from
  visitor traffic during matches, so you're covered even without a working cron.
  NOTE: `vercel.json` is set to a 2-hour schedule (`0 */2 * * *`). **Vercel Hobby
  rejects anything more frequent than once per day at deploy time** — if your
  deploy fails with a cron error, change the schedule to `0 12 * * *` (daily) or
  upgrade to Pro. The 2-hour cron only actually runs on Pro or via an external
  scheduler.
- **Want minute-level push refresh for free:** use an external scheduler.
  1. Sign up at cron-job.org (free).
  2. Point it at `https://YOUR-APP.vercel.app/api/cron/refresh` every 1–2 minutes.
  3. Add an `Authorization: Bearer <CRON_SECRET>` header. Set `CRON_SECRET` to any
     long random string in Vercel env vars and match it in the scheduler.
- **On Vercel Pro:** edit `vercel.json` schedule to `"* * * * *"` (every minute).
  Vercel sets `CRON_SECRET` and sends it automatically.

## Local development
```bash
npm install
npm i -g vercel          # if you don't have it
echo "FOOTBALL_DATA_API_KEY=your_key" > .env
vercel dev               # serves frontend + /api routes at localhost:3000
```

## File map
```
public/index.html        Frontend (React via CDN, no build step). Live/Standings/History tabs.
api/live.js              Read endpoint the frontend polls every 60s.
api/standings.js         Group tables (cached 1h).
api/scorers.js           Top scorers (cached 30m).
api/cron/refresh.js      The scheduled puller. Auth-gated by CRON_SECRET.
lib/provider.js          Provider adapter — SWAP THIS FILE to change data sources.
lib/cache.js             KV-or-memory cache with TTLs.
vercel.json              Cron schedule (daily by default; see step 5).
```

## Swapping data providers
The app only depends on the normalized shapes returned by `lib/provider.js`
(`fetchLiveAndToday`, `fetchStandings`, `fetchScorers`). To move to API-Football,
TheStatsAPI, etc., rewrite only the fetch + map logic in that one file. Nothing
else changes.

## Quota math (football-data.org free tier, 10 req/min)
- Pull-through: at most 1 provider call per 60s for live = well within limits.
- Standings/scorers refresh only when their (long) TTL expires.
- Even with the per-minute cron, that's ~1 call/min + occasional slow-data
  refreshes — comfortably inside 10/min.

## Caveats worth knowing
- Free-tier data can lag the true live score by a short delay; for sub-15s
  precision you'd move to a paid provider and shorten the TTL.
- `football-data.org` coverage of deep stats (xG, lineups) is limited on free;
  the swap-the-adapter design is there for when you outgrow it.
- This is the live-data layer + a lean frontend. The predictive models, fantasy
  module, and other features from the origidnal brief are separate builds.