import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { computeEtag, privateNoStore } from '@/lib/edge-cache';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const FREE_LIMIT = 5;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function normalizeNetwork(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const up = v.trim().toUpperCase();
  if (up === 'TON' || up === 'BSC' || up === 'BASE') return up;
  return null;
}

function normalizeAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length < 4 || trimmed.length > 128) return null;
  return trimmed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isPro(supabase: any, tgUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, pro_expiration_date')
    .eq('telegram_user_id', tgUserId)
    .maybeSingle();
  if (!data) return false;
  if (data.tier !== 'pro') return false;
  if (!data.pro_expiration_date) return false;
  return new Date(data.pro_expiration_date).getTime() > Date.now();
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 500, headers: PRIVATE_HEADERS });
    }

    if (action === 'list') {
      const { data } = await supabase
        .from('user_watchlist')
        .select('id, network, token_address, token_symbol, token_name, added_at')
        .eq('telegram_user_id', tgUserId)
        .order('added_at', { ascending: false });
      const pro = await isPro(supabase, tgUserId);
      const payload = {
        ok: true,
        items: data ?? [],
        limit: pro ? null : FREE_LIMIT,
        isPro: pro,
      };
      const etag = computeEtag(payload);
      if (req.headers.get('if-none-match') === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag, ...PRIVATE_HEADERS } });
      }
      return NextResponse.json(payload, { headers: { ETag: etag, ...PRIVATE_HEADERS } });
    }

    if (action === 'add') {
      const network = normalizeNetwork(body.network);
      const address = normalizeAddress(body.token_address);
      if (!network || !address) {
        return privateNoStore({ ok: false, error: 'invalid_token' }, 400);
      }

      const pro = await isPro(supabase, tgUserId);
      if (!pro) {
        const { count } = await supabase
          .from('user_watchlist')
          .select('*', { count: 'exact', head: true })
          .eq('telegram_user_id', tgUserId);
        if ((count ?? 0) >= FREE_LIMIT) {
          return privateNoStore(
            { ok: false, error: 'limit_reached', limit: FREE_LIMIT },
            403,
          );
        }
      }

      const symbol = typeof body.token_symbol === 'string' ? body.token_symbol.slice(0, 32) : null;
      const name = typeof body.token_name === 'string' ? body.token_name.slice(0, 128) : null;

      const { error } = await supabase.from('user_watchlist').upsert(
        {
          telegram_user_id: tgUserId,
          network,
          token_address: address,
          token_symbol: symbol,
          token_name: name,
        },
        { onConflict: 'telegram_user_id,network,token_address' },
      );
      if (error) {
        return privateNoStore({ ok: false, error: 'db_error' }, 500);
      }
      return privateNoStore({ ok: true });
    }

    if (action === 'remove') {
      const network = normalizeNetwork(body.network);
      const address = normalizeAddress(body.token_address);
      if (!network || !address) {
        return privateNoStore({ ok: false, error: 'invalid_token' }, 400);
      }
      const { error } = await supabase
        .from('user_watchlist')
        .delete()
        .eq('telegram_user_id', tgUserId)
        .eq('network', network)
        .eq('token_address', address);
      if (error) {
        return privateNoStore({ ok: false, error: 'db_error' }, 500);
      }
      return privateNoStore({ ok: true });
    }

    return privateNoStore({ ok: false, error: 'unknown_action' }, 400);
  } catch {
    return privateNoStore({ ok: false, error: 'server_error' }, 500);
  }
}
