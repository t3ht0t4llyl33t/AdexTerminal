/*
# Create rate-limit RPC function

## Purpose
Replaces the in-memory rate-limit Map in middleware with a durable,
instance-independent Postgres-backed rate limiter. Every API request
calls `check_rate_limit(key, max_requests, window_ms)` which atomically
increments a counter for the given key within a sliding window.

## New Objects
- `rate_limit_buckets` table — stores per-key counters with a reset timestamp.
  Columns: `key` (text, PK), `count` (int), `reset_at` (bigint epoch ms).
- `check_rate_limit(key text, max_requests int, window_ms int)` — SECURITY DEFINER
  function that atomically checks and increments the rate limit for a key.
  Returns a JSON object `{ allowed: bool, count: int, reset_at: bigint }`.
  Uses `pg_advisory_xact_lock` keyed by `hashtext(key)` to serialize concurrent
  requests for the same key, preventing race conditions.

## Security
- RLS enabled on `rate_limit_buckets` — no policies, so the table is locked
  down. Only the `check_rate_limit` SECURITY DEFINER function (owned by
  `postgres`) can read/write it. The anon/authenticated roles cannot touch
  the table directly.
- `check_rate_limit` is callable by `anon` and `authenticated` because the
  Next.js middleware uses the service-role connection (bypasses RLS), but
  we grant EXECUTE to be safe for any direct Supabase client calls.

## Notes
1. The function cleans up expired entries on each call (best-effort).
2. `pg_advisory_xact_lock` ensures atomicity without table-level locks.
3. The table uses `hashtext(key)` for advisory lock to avoid int overflow.
*/

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at bigint NOT NULL DEFAULT 0
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No policies: the table is accessible only through the SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_requests int DEFAULT 5,
  p_window_ms int DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now bigint;
  v_reset_at bigint;
  v_count int;
  v_allowed boolean;
BEGIN
  v_now := (extract(epoch from now()) * 1000)::bigint;

  -- Advisory lock keyed by hash of the key to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  -- Best-effort cleanup of expired entries (keep table small)
  DELETE FROM rate_limit_buckets WHERE reset_at < v_now AND key <> p_key;

  SELECT count, reset_at INTO v_count, v_reset_at
  FROM rate_limit_buckets WHERE key = p_key;

  IF v_count IS NULL OR v_now > v_reset_at THEN
    v_count := 1;
    v_reset_at := v_now + p_window_ms;
    v_allowed := true;
    INSERT INTO rate_limit_buckets (key, count, reset_at)
    VALUES (p_key, v_count, v_reset_at)
    ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = v_reset_at;
  ELSE
    v_count := v_count + 1;
    v_allowed := v_count <= p_max_requests;
    UPDATE rate_limit_buckets SET count = v_count WHERE key = p_key;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'reset_at', v_reset_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO anon, authenticated;
