/*
# Create public roadmap items table

## What this migration does

Adds a small, curated `roadmap_items` table that powers the public
`/roadmap` page on the aDEX Terminal landing site. Each item describes
a product milestone in one of three lanes ("shipped", "in_progress",
"next") with a short title, a longer description, and a manual sort
position.

Rows are managed by the operator through the Supabase dashboard or a
future admin surface — the public app never writes to this table.

## New tables

### `roadmap_items`
- `id` (uuid, primary key) — generated automatically
- `title` (text, not null) — short milestone title
- `description` (text, not null) — one or two sentences of detail
- `category` (text, not null) — must be `shipped`, `in_progress` or `next`
- `position` (integer, not null, default 0) — manual ordering within a lane
- `published` (boolean, not null, default true) — flip to false to hide drafts
- `created_at` (timestamptz, default now())

An index on (category, position, created_at) keeps the ordered listing
cheap.

## Security

RLS is enabled. A single public SELECT policy exposes only rows where
`published = true`, so drafts stay invisible even to the anon client.
There are no INSERT / UPDATE / DELETE policies — writes only succeed
through the service role, which bypasses RLS.

## Seed data

Inserts a small starter set of milestones so the page never renders
empty during first deploy. Each seed row is idempotent (checked by
title) so this migration can be safely re-run.
*/

CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('shipped', 'in_progress', 'next')),
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_category_position
  ON roadmap_items (category, position, created_at);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published_roadmap" ON roadmap_items;
CREATE POLICY "public_read_published_roadmap" ON roadmap_items
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Volume Radar for TON, BSC and Base',
       'Unified 15-minute spike radar across three networks with cached refresh and per-chain filters.',
       'shipped', 10
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Volume Radar for TON, BSC and Base');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Whale X-Ray with wallet snapshots',
       'Live whale wallet feed with cross-chain context and one-tap portfolio snapshots for any address.',
       'shipped', 20
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Whale X-Ray with wallet snapshots');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Contract Vault safety scanner',
       'Instant safety readouts powered by GoPlus signals for BSC and Base, plus on-chain heuristics for TON.',
       'shipped', 30
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Contract Vault safety scanner');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Telegram alerts for spikes and whales',
       'Configurable alert rules delivered directly to Telegram, with automatic dedup and throttling.',
       'shipped', 40
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Telegram alerts for spikes and whales');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'TON Connect PRO subscriptions',
       'One-tap PRO upgrade paid directly from your TON wallet, with automatic subscription lifecycle checks.',
       'shipped', 50
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'TON Connect PRO subscriptions');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Personal watchlist with daily digest',
       'Pin up to five tokens per account and receive a personalised morning digest in Telegram.',
       'in_progress', 10
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Personal watchlist with daily digest');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Simplified Chinese localisation',
       'Full 中文 translation of the Mini App and landing site with dedicated review of crypto terminology.',
       'in_progress', 20
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Simplified Chinese localisation');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Public "Recent findings" showcase',
       'A curated feed on the landing page that highlights fresh community-reported risky contracts.',
       'in_progress', 30
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Public "Recent findings" showcase');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Portfolio snapshot in 60 seconds',
       'Paste any wallet address and get its USD value, top-3 holdings and risk flags in one screen.',
       'next', 10
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Portfolio snapshot in 60 seconds');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Weekly whale report',
       'One weekly summary in Telegram covering the biggest whale moves and safety highlights of the week.',
       'next', 20
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Weekly whale report');

INSERT INTO roadmap_items (title, description, category, position)
SELECT 'Referral lightning boost',
       'A time-boxed reward that grants the inviter +15 days of PRO when a referral upgrades within 24 hours.',
       'next', 30
WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE title = 'Referral lightning boost');
