/*
# Support Knowledge Base, User Subscriptions, Chat Rate Limits

## Purpose
Creates three tables to support the RAG support system, subscription renewal reminders, and anti-flood chat protection.

## Tables

### support_knowledge_base
- `id` (uuid, primary key)
- `title` (text, not null) — article/rule title
- `content` (text, not null) — full text content for RAG retrieval
- `category` (text) — category tag (e.g., 'academy', 'rules', 'trading')
- `lang` (text, default 'EN') — language of the content
- `embedding` (vector(1536), nullable) — pgvector embedding for semantic search
- `created_at` (timestamptz, default now())

### user_subscriptions
- `id` (uuid, primary key)
- `telegram_user_id` (text, unique, not null) — Telegram user identifier
- `tier` (text, default 'free') — 'free' or 'pro'
- `pro_expiration_date` (timestamptz, nullable) — when pro access expires
- `language` (text, default 'EN') — user's preferred language
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### chat_rate_limits
- `id` (uuid, primary key)
- `telegram_user_id` (text, not null) — Telegram user identifier
- `message_count` (integer, default 0) — messages in current window
- `window_start` (timestamptz, default now()) — start of 10-second rolling window
- `muted_until` (timestamptz, nullable) — if set, user is muted until this time
- `created_at` (timestamptz, default now())
- Unique constraint on telegram_user_id

## Security
- RLS enabled on all tables
- Policies allow anon + authenticated access (no-auth app pattern)

## Notes
- pgvector extension enabled for semantic embedding support
- Index on support_knowledge_base embedding for fast similarity search
- Index on user_subscriptions pro_expiration_date for cron queries
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Support Knowledge Base table
CREATE TABLE IF NOT EXISTS support_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'academy',
  lang text DEFAULT 'EN',
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skb_embedding ON support_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_skb_category ON support_knowledge_base (category);

ALTER TABLE support_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_skb" ON support_knowledge_base;
CREATE POLICY "anon_select_skb" ON support_knowledge_base FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_skb" ON support_knowledge_base;
CREATE POLICY "anon_insert_skb" ON support_knowledge_base FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_skb" ON support_knowledge_base;
CREATE POLICY "anon_update_skb" ON support_knowledge_base FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_skb" ON support_knowledge_base;
CREATE POLICY "anon_delete_skb" ON support_knowledge_base FOR DELETE
  TO anon, authenticated USING (true);

-- User Subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  pro_expiration_date timestamptz,
  language text NOT NULL DEFAULT 'EN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sub_expiration ON user_subscriptions (pro_expiration_date);
CREATE INDEX IF NOT EXISTS idx_user_sub_tg_id ON user_subscriptions (telegram_user_id);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_sub" ON user_subscriptions;
CREATE POLICY "anon_select_user_sub" ON user_subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_sub" ON user_subscriptions;
CREATE POLICY "anon_insert_user_sub" ON user_subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_sub" ON user_subscriptions;
CREATE POLICY "anon_update_user_sub" ON user_subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_user_sub" ON user_subscriptions;
CREATE POLICY "anon_delete_user_sub" ON user_subscriptions FOR DELETE
  TO anon, authenticated USING (true);

-- Chat Rate Limits table (anti-flood)
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  muted_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_rate_tg_id ON chat_rate_limits (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rate_muted ON chat_rate_limits (muted_until);

ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_rate" ON chat_rate_limits;
CREATE POLICY "anon_select_chat_rate" ON chat_rate_limits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_rate" ON chat_rate_limits;
CREATE POLICY "anon_insert_chat_rate" ON chat_rate_limits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_rate" ON chat_rate_limits;
CREATE POLICY "anon_update_chat_rate" ON chat_rate_limits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_rate" ON chat_rate_limits;
CREATE POLICY "anon_delete_chat_rate" ON chat_rate_limits FOR DELETE
  TO anon, authenticated USING (true);
