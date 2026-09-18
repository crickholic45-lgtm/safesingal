# SafeSignal — Working Prototype

Anonymous micro-reporting + pattern-detection engine for public-space safety.
Built and tested with Next.js 14 + Supabase. This build has been compiled and
type-checked already — it works, you just need to plug in your own free
Supabase project.

## What's in this zip

```
app/
  page.tsx                    - landing page (links to report / dashboard)
  report/page.tsx             - public GPS/map-pin reporting flow
  dashboard/page.tsx          - authority dashboard, active signals + history
  dashboard/ZoneMap.tsx       - Leaflet map component
  api/report/route.ts         - handles report submission + cooldown check
  api/score/route.ts          - runs the scoring engine across all zones
  api/alerts/route.ts         - fetches active alerts for the dashboard
  api/alerts/[id]/status/route.ts - mark an alert reviewed/dismissed
lib/
  engine.ts                   - the pattern detection engine (pure logic, no DB calls)
  supabase.ts                 - Supabase client setup (browser + server)
middleware.ts                 - basic-auth lock on /dashboard
supabase/schema.sql           - full database schema + seed data, run this first
.env.example                  - copy to .env.local and fill in
```

## Step-by-step setup (about 15 minutes)

### 1. Create a free Supabase project
- Go to supabase.com → New Project (free tier is enough)
- Wait for it to finish provisioning (~2 min)

### 2. Run the schema
- In your Supabase project: **SQL Editor → New query**
- Paste the entire contents of `supabase/schema.sql` and run it
- This creates the `zones`, `reports`, and `zone_alerts` tables, sets up
  Row Level Security, exact-coordinate columns, and 4 demo zones (edit the `insert into zones`
  block at the bottom of that file to use your actual venue's spots)

### 3. Get your API keys
- In Supabase: **Settings → API**
- Copy the **Project URL**, the **anon public** key, and the **service_role** key

### 4. Configure environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and paste in the three values from step 3. Leave
`DASHBOARD_USER` / `DASHBOARD_PASS` as-is or change them — this is the
username/password your browser will ask for when you open `/dashboard`.

### 5. Install and run
```bash
npm install
npm run dev
```
Open **http://localhost:3000** — you'll see the landing page with two links.

### 6. Try the full loop
1. Go to `/report`, allow location access or tap/drag anywhere on the map,
  choose a category, and submit. The exact approved coordinates are stored
  separately from the nearest named zone used for pattern grouping.
2. Submit a few more reports for the *same* zone — for the pattern engine
   to fire you need reports from **at least 4 different "reporters"** across
   **at least 2 different days** (see `lib/engine.ts` for the exact numbers).
   For a quick demo, temporarily lower `MIN_DISTINCT_REPORTERS` and
   `MIN_DISTINCT_DAYS` in `lib/engine.ts`, or manually edit a few rows'
   `created_at` values in Supabase's Table Editor to simulate different days.
3. Go to `/dashboard` (browser will prompt for the username/password from
  your `.env.local`), click **"Recalculate patterns"**.
4. If the zone cleared the floor, an alert card appears with its score,
  tier, and a pin on the map. Click **Mark reviewed** or **Dismiss**;
  use **Past history** to review the status and report record afterward.

## How the engine actually works

Full explanation with the exact formula is in `lib/engine.ts` — it's
commented line by line. Short version: four rules run in order —
1. **Cooldown** (same device can't spam the same zone)
2. **Aggregation** (count reports per zone over a 14-day window)
3. **Hard floor** (need 4+ distinct reporters AND 2+ distinct days, or
   nothing fires — this is what makes flooding mathematically pointless)
4. **Weighted score** (volume, reporter diversity, time spread, category
   diversity, multiplied together)

No AI/ML in the detection logic on purpose — it's fully deterministic and
explainable, which is a stronger answer to "how do we trust this" than a
black-box model would be.

## Simulating a demo scenario (flood vs. real pattern)

For the strongest live-demo moment: before presenting, use Supabase's
Table Editor to insert two sets of test rows into `reports` directly:

- **Fake flood:** 15 rows, same `zone_id`, same `category`, all with
  `reporter_token` values from only 2–3 distinct UUIDs, all `created_at`
  within the same hour. Run the recalculate — this zone should stay silent
  (below the floor).
- **Real pattern:** 6 rows for a different zone, 6 different
  `reporter_token` UUIDs, `created_at` spread across 3 different dates
  (edit the timestamps directly in the table). Run the recalculate — this
  one should light up.

Showing both side by side on the dashboard is the single most convincing
thing you can do for judges — it proves the anti-gaming claim instead of
just asserting it.

## Known limitations (say these out loud in your pitch — they read as
## intentional scoping, not oversights)

- **`/dashboard` uses HTTP Basic Auth, not a full login system.** This was
  a deliberate scope decision for the hackathon timeline — enough to
  keep the dashboard from being publicly browsable, not a production-grade
  auth system with roles/sessions.
- **Pattern grouping uses named zones, while reports retain exact approved
  coordinates.** Add more zones for better scoring granularity in an open
  market or large campus.
- **No SMS/WhatsApp push notifications** — the dashboard is the live view
  for this build; push notifications to an authority's phone are noted as
  production roadmap.
- **No LLM-based text classification wired in yet** — the optional
  `detail` free-text field is stored but not yet analyzed. If you want to
  add the "AI" layer discussed earlier (severity mismatch detection via
  Hugging Face's free Inference API), that's the next natural addition —
  ask and it can be added as a follow-up.
- **RLS currently allows public read of `zone_alerts`** for simplicity in
  this prototype (so the dashboard API route works without extra auth
  wiring at the database level). In production, this should be tightened
  to only allow the service role to read it, with the dashboard's own
  auth being the sole gate — worth mentioning as a "next hardening step"
  if asked.

## Deploying so you have a live URL (optional, 10 more minutes)

```bash
git init && git add . && git commit -m "SafeSignal prototype"
```
Push to a GitHub repo, then import it at vercel.com (free tier). Add the
same environment variables from `.env.local` in Vercel's project settings
before deploying. Every push after that auto-deploys.
