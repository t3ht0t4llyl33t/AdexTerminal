import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { getWhalesFromCache } from '@/selectors/apiConfig';
import { cachedJson } from '@/lib/edge-cache';
import type { WhaleAlert } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_OPTS = { sMaxAge: 30, swr: 120 };

async function loadFromDb(): Promise<WhaleAlert[] | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('radar_cache')
      .select('whales, updated_at')
      .eq('id', 'latest')
      .maybeSingle();
    if (error || !data) return null;
    return (data.whales as WhaleAlert[]) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const memory = getWhalesFromCache();
  if (memory.length > 0) {
    return cachedJson(
      req,
      { data: memory, cached: true, timestamp: Date.now(), source: 'cache' },
      CACHE_OPTS,
      'live',
    );
  }

  const db = await loadFromDb();
  if (db && db.length > 0) {
    return cachedJson(
      req,
      { data: db, cached: true, timestamp: Date.now(), source: 'cache' },
      CACHE_OPTS,
      'live',
    );
  }

  return cachedJson(
    req,
    { data: [], cached: true, timestamp: Date.now(), source: 'cache' },
    { ...CACHE_OPTS, staleReason: 'no_data' },
    'fallback',
  );
}
