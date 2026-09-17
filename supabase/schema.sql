-- ==========================================================
-- SafeSignal — Database Schema
-- Run this entire file in Supabase: Project -> SQL Editor -> New query
-- ==========================================================

-- Zones: pre-mapped locations (station platforms, market gates, corridor blocks)
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude float not null,
  longitude float not null,
  venue_type text default 'general' -- 'market', 'station', 'university'
);

-- Reports: the actual anonymous taps
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references zones(id) on delete cascade,
  category text not null,
  reporter_token text not null,   -- random UUID generated client-side, never tied to identity
  detail text,                    -- optional free text
  is_immediate boolean default false, -- true for serious categories that skip the pattern engine
  created_at timestamptz default now(),
  report_ref_id text unique not null
);

create index if not exists idx_reports_zone_time on reports (zone_id, created_at);
create index if not exists idx_reports_token on reports (reporter_token);

-- Zone alerts: computed pattern flags — place-based, never person-based
create table if not exists zone_alerts (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references zones(id) on delete cascade,
  score float,
  tier text,                      -- 'watch', 'elevated', 'urgent', 'immediate'
  distinct_reporters int,
  distinct_days int,
  total_reports int,
  top_categories text[],
  status text default 'active',   -- 'active', 'reviewed', 'dismissed'
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (zone_id)
);

-- ==========================================================
-- Row Level Security — this is what makes anonymity real,
-- not just a claim in the pitch deck.
-- ==========================================================

alter table reports enable row level security;
alter table zone_alerts enable row level security;
alter table zones enable row level security;

-- Anyone (anon key) can INSERT a report, nobody can read raw reports
-- through the public API — only the server (service role key) can.
create policy "anyone can submit a report"
  on reports for insert
  to anon
  with check (true);

-- Zones list is public (needed for the report-picker UI)
create policy "anyone can read zones"
  on zones for select
  to anon
  using (true);

-- zone_alerts is readable by anon for simplicity in this prototype.
-- In production, this should be restricted to authenticated authority
-- accounts only — see README "Known limitations" section.
create policy "anyone can read zone alerts"
  on zone_alerts for select
  to anon
  using (true);

-- ==========================================================
-- Seed data — a few demo zones so the app has something to show
-- immediately. Replace with your real venue's zones.
-- ==========================================================

insert into zones (name, latitude, longitude, venue_type) values
  ('Bhayandar Station', 19.3016, 72.8517, 'station'),
  ('Thadomal Shahani Engg. College Gate', 19.0728, 72.8351, 'university'),
  ('VCET Main Gate', 19.2003, 72.8397, 'university'),
  ('Market Square - Gate 1', 19.2183, 72.9781, 'market')
on conflict do nothing;
