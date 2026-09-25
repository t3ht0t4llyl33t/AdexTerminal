/**
 * fetchWithBackoff — resilient fetch with exponential backoff.
 *
 * Retries on 429 and 5xx responses (and network errors), honoring the
 * Retry-After header when present. Returns the Response on success or
 * throws on final failure.
 */
export interface BackoffOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function fetchWithBackoff(
  url: string,
  init: RequestInit = {},
  opts: BackoffOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 300;
  const maxMs = opts.maxMs ?? 10_000;
  const timeoutMs = opts.timeoutMs ?? 10_000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { ...opts.headers, ...(init.headers as Record<string, string> | undefined) },
      });

      clearTimeout(timeout);

      if (res.ok) return res;

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === retries) return res;

      const retryAfter = res.headers.get('retry-after');
      let delay = baseMs * Math.pow(2, attempt);
      if (retryAfter) {
        const parsed = parseFloat(retryAfter);
        if (Number.isFinite(parsed)) {
          delay = Math.max(delay, parsed * 1000);
        }
      }
      delay = Math.min(delay, maxMs);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) throw err;
      const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(`fetchWithBackoff: exhausted ${retries + 1} attempts for ${url}`);
}
