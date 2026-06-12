-- ============================================================
-- World Cup Hub — notification subscriptions schema
-- Run this in the Supabase SQL editor once.
-- ============================================================

-- Who wants to be notified about what.
create table if not exists subscriptions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  -- what they're subscribing to:
  --   scope = 'all'    → every match (kickoffs + results)
  --   scope = 'team'   → target holds the team name
  --   scope = 'player' → target holds the player name
  --   scope = 'goals'  → goals / key moments only (across all matches)
  scope       text not null check (scope in ('all','team','player','goals')),
  target      text,                         -- team or player name, null for all/goals
  confirmed   boolean default false,        -- double opt-in (see confirm flow)
  confirm_token text,                       -- emailed link token
  created_at  timestamptz default now()
);

create index if not exists subs_email_idx on subscriptions (lower(email));
create index if not exists subs_scope_idx on subscriptions (scope, target);

-- Dedupe ledger: remembers which (event → subscriber) emails already went out
-- so the cron never sends the same alert twice.
create table if not exists sent_notifications (
  id            uuid primary key default gen_random_uuid(),
  event_key     text not null,              -- stable id for the event, e.g. "goal:match123:min67:Messi"
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  sent_at       timestamptz default now(),
  unique (event_key, subscription_id)       -- the guard that prevents duplicates
);

create index if not exists sent_event_idx on sent_notifications (event_key);

-- Row Level Security. We only ever touch these from server-side functions using
-- the SERVICE ROLE key, so we lock out the anon/public role entirely.
alter table subscriptions enable row level security;
alter table sent_notifications enable row level security;
-- (No public policies created on purpose → only service_role can read/write.)