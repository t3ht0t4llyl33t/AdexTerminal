'use client';

import { getInitData } from '@/lib/telegram-webapp';

export function authHeaders(base?: HeadersInit): Headers {
  const headers = new Headers(base ?? {});
  const initData = getInitData();
  if (initData) headers.set('x-telegram-init-data', initData);
  return headers;
}

export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers);
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}
