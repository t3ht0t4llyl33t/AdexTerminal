export const TONAPI_BASE = 'https://tonapi.io/v2';

const TONAPI_KEY = process.env.TONAPI_KEY || '';

export function tonApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  if (TONAPI_KEY) headers['Authorization'] = `Bearer ${TONAPI_KEY}`;
  return headers;
}

export function hasTonApiKey(): boolean {
  return TONAPI_KEY.length > 0;
}
