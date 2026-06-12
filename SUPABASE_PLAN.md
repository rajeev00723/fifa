# Future: Supabase Bracket Game + Leaderboard

You chose to ship the no-database features first. When you're ready to add the
**user bracket game and leaderboard**, here's the complete plan — it slots into
your existing Vercel setup without disrupting anything.

## Why Supabase fits here

The bracket game needs to remember things across users and across time: each
person's predicted bracket, and a shared leaderboard. That's persistent,
multi-user state — exactly what a database is for and what your current
stateless app can't do. Supabase gives you a Postgres database + auth + a REST
API with a generous free tier, and it works cleanly with Vercel serverless.

## Setup (when ready)

1. Create a project at supabase.com (free tier).
2. In the SQL editor, run the schema below.
3. In Vercel → Settings → Environment Variables, add:
   - `SUPABASE_URL` (from Supabase project settings)
   - `SUPABASE_ANON_KEY` (the public anon key — safe for client use with RLS on)
4. `npm install @supabase/supabase-js` and add it to package.json.

## Schema

```sql
-- A user's bracket picks for the knockout stage.
create table brackets (
  id          uuid primary key default gen_random_uuid(),
  display_name text not null,           -- shown on the leaderboard
  picks       jsonb not null,           -- { "R16-1": "Brazil", "QF-1": "Brazil", ... }
  created_at  timestamptz default now(),
  score       int default 0             -- updated as real results come in
);

-- Optional: lock one bracket per browser/session to prevent spam.
create unique index brackets_name_idx on brackets (lower(display_name));

-- Row Level Security: anyone can read the leaderboard, anyone can insert one
-- bracket, but nobody can edit someone else's.
alter table brackets enable row level security;

create policy "read all"   on brackets for select using (true);
create policy "insert own" on brackets for insert with check (true);
```

## Scoring

A small scheduled job (reuse your existing cron pattern) reads finished knockout
matches from your live feed, compares each stored bracket's picks to actual
results, and updates `score`. Suggested: 1 point per correct R16 pick, 2 per QF,
4 per SF, 8 for the champion — rewards getting the deep rounds right.

## New files you'd add

```
lib/supabase.js          createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
api/bracket-submit.js    POST a bracket → insert row
api/leaderboard.js       GET top brackets by score
api/cron/score.js        recompute scores from finished matches (add to vercel.json crons)
```
Plus a "Bracket" tab in index.html: a clickable knockout tree to make picks, a
submit button, and a leaderboard table reading /api/leaderboard.

## Security notes

- The anon key is designed to be public IF row-level security is on (it is,
  above). Never expose the `service_role` key in the frontend.
- Validate picks server-side in bracket-submit.js — don't trust the client to
  send only valid team names.

## When NOT to bother

If the app stays a personal/portfolio piece with light traffic, the no-database
features (live win probability, the Monte Carlo simulator you just shipped) give
most of the "intelligence" feel without the moving parts. Add Supabase only when
you actually want users saving and competing.