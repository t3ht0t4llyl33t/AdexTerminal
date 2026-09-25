import { getSupabase } from '@/lib/supabase-server';
import { fetchWithBackoff, type BackoffOptions } from '@/lib/fetch-backoff';

/**
 * cachedFetch — Supabase-backed response cache for external API calls.
 *
 * Checks the `api_response_cache` table for a fresh entry matching `key`.
 * If found and not expired, returns the cached JSON payload directly.
 * Otherwise calls `fetcher` (or falls back to a GET via fetchWithBackoff),
 * stores the result, and returns it.
 *
 * @param key      Deterministic cache key (e.g. URL or URL + hash of params)
 * @param ttlMs    Cache time-to-live in milliseconds
 * @param fetcher  Optional custom async function that returns the JSON payload.
 *                 If omitted, performs a GET request to `url` with backoff.
 * @param url      URL to fetch (required when no custom fetcher)
 * @param opts     Backoff options for the fallback fetcher
 */
export async function cachedFetch<T = unknown>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const supabase = getSupabase();

  // 1. Try cache hit
  try {
    const { data } = await supabase
      .from('api_response_cache')
      .select('payload, expires_at')
      .eq('key', key)
      .maybeSingle();

    if (data) {
      const expiresAt = new Date(data.expires_at as string).getTime();
      if (Date.now() < expiresAt) {
        return data.payload as T;
      }
    }
  } catch {
    // cache read failure — fall through to live fetch
  }

  // 2. Live fetch
  const payload = await fetcher();

  // 3. Store in cache (fire-and-forget, best-effort)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
  Promise.resolve(
    supabase
      .from('api_response_cache')
      .upsert(
        { key, payload: payload as unknown as Record<string, unknown>, expires_at: expiresAt, updated_at: now.toISOString() },
        { onConflict: 'key' },
      ),
  ).catch(() => {});

  return payload;
}

/**
 * cachedFetchJson — convenience wrapper for simple GET requests.
 * Fetches `url` with backoff, parses JSON, caches the result.
 */
export async function cachedFetchJson<T = unknown>(
  key: string,
  url: string,
  ttlMs: number,
  opts: BackoffOptions = {},
): Promise<T | null> {
  return cachedFetch<T | null>(key, ttlMs, async () => {
    try {
      const res = await fetchWithBackoff(url, {}, opts);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  });
}
