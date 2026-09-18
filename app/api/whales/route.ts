import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { getWhalesFromCache } from '@/selectors/apiConfig';
import type { WhaleAlert } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function GET() {
  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
  };

  const memory = getWhalesFromCache();
  if (memory.length > 0) {
    return NextResponse.json(
      { data: memory, cached: true, timestamp: Date.now(), source: 'cache' },
      { headers: cacheHeaders },
    );
  }

  const db = await loadFromDb();
  if (db && db.length > 0) {
    return NextResponse.json(
      { data: db, cached: true, timestamp: Date.now(), source: 'cache' },
      { headers: cacheHeaders },
    );
  }

  return NextResponse.json(
    { data: [], cached: true, timestamp: Date.now(), source: 'cache' },
    { headers: cacheHeaders },
  );
}
