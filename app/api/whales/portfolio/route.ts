import { NextRequest, NextResponse } from 'next/server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { getCachedData } from '@/selectors/apiConfig';
import { getSupabase } from '@/lib/supabase-server';
import { TONAPI_BASE, tonApiHeaders } from '@/lib/tonapi';
import type { Network } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PortfolioResponse {
  ok: boolean;
  wallet_address: string;
  token_address: string;
  network: Network;
  trade_amount_usd: number;
  total_tokens_held: number;
  total_position_value_usd: number;
  token_price_usd: number;
  ai_verdict: string;
  cache_hit: boolean;
  cache_age_seconds: number;
  error?: string;
}

const EVM_RPC: Record<string, string> = {
  BSC: 'https://bsc-dataseed.binance.org',
  BASE: 'https://mainnet.base.org',
};

const FRESH_TTL_MS = 45_000;
const NEGATIVE_TTL_MS = 10_000;
const DECIMALS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenMetaRow {
  decimals: number;
  updatedAt: number;
}

const decimalsCache = new Map<string, TokenMetaRow>();
const decimalsInflight = new Map<string, Promise<number>>();

async function readDecimalsCache(network: Network, tokenAddress: string): Promise<number | null> {
  const key = `${network}|${tokenAddress.toLowerCase()}`;
  const mem = decimalsCache.get(key);
  if (mem && Date.now() - mem.updatedAt < DECIMALS_TTL_MS) return mem.decimals;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('token_metadata')
      .select('decimals, updated_at')
      .eq('id', key)
      .maybeSingle();
    if (!data) return null;
    const row: TokenMetaRow = {
      decimals: Number(data.decimals) || 0,
      updatedAt: new Date(data.updated_at).getTime(),
    };
    if (row.decimals > 0 && Date.now() - row.updatedAt < DECIMALS_TTL_MS) {
      decimalsCache.set(key, row);
      return row.decimals;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeDecimalsCache(
  network: Network,
  tokenAddress: string,
  decimals: number,
): Promise<void> {
  const key = `${network}|${tokenAddress.toLowerCase()}`;
  decimalsCache.set(key, { decimals, updatedAt: Date.now() });
  try {
    const supabase = getSupabase();
    await supabase.from('token_metadata').upsert(
      {
        id: key,
        network,
        address: tokenAddress.toLowerCase(),
        decimals,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch (err) {
    console.error('[whales/portfolio] decimals cache write failed:', err);
  }
}

async function fetchEvmDecimalsOnchain(network: Network, tokenAddress: string): Promise<number> {
  const rpc = EVM_RPC[network];
  if (!rpc) return 18;
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: tokenAddress, data: '0x313ce567' }, 'latest'],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return 18;
    const json = (await res.json()) as Record<string, unknown>;
    const result = json.result as string | undefined;
    if (!result || result === '0x') return 18;
    const decimals = Number(BigInt(result));
    return decimals >= 0 && decimals <= 36 ? decimals : 18;
  } catch {
    return 18;
  }
}

async function fetchTonDecimalsOnchain(tokenAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `${TONAPI_BASE}/jettons/${tokenAddress}`,
      { headers: tonApiHeaders(), signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return 9;
    const json = (await res.json()) as Record<string, unknown>;
    const metadata = json.metadata as Record<string, unknown> | undefined;
    const decimalsRaw = metadata?.decimals ?? json.decimals;
    const decimals =
      typeof decimalsRaw === 'number'
        ? decimalsRaw
        : typeof decimalsRaw === 'string'
          ? parseInt(decimalsRaw, 10)
          : NaN;
    if (Number.isFinite(decimals) && decimals >= 0 && decimals <= 36) return decimals;
    return 9;
  } catch {
    return 9;
  }
}

async function getTokenDecimals(network: Network, tokenAddress: string): Promise<number> {
  const cached = await readDecimalsCache(network, tokenAddress);
  if (cached !== null) return cached;

  const key = `${network}|${tokenAddress.toLowerCase()}`;
  const existing = decimalsInflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      const decimals =
        network === 'TON'
          ? await fetchTonDecimalsOnchain(tokenAddress)
          : await fetchEvmDecimalsOnchain(network, tokenAddress);
      await writeDecimalsCache(network, tokenAddress, decimals);
      return decimals;
    } finally {
      decimalsInflight.delete(key);
    }
  })();

  decimalsInflight.set(key, task);
  return task;
}

interface CacheRow {
  totalTokensHeld: number;
  tokenPriceUsd: number;
  totalPositionValueUsd: number;
  ok: boolean;
  updatedAt: number;
}

const inflight = new Map<string, Promise<CacheRow>>();

function cacheKey(network: Network, tokenAddress: string, walletAddress: string): string {
  return `${network}|${tokenAddress.toLowerCase()}|${walletAddress.toLowerCase()}`;
}

async function readCache(id: string): Promise<CacheRow | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('whale_portfolio_cache')
      .select('total_tokens_held, token_price_usd, total_position_value_usd, ok, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      totalTokensHeld: Number(data.total_tokens_held) || 0,
      tokenPriceUsd: Number(data.token_price_usd) || 0,
      totalPositionValueUsd: Number(data.total_position_value_usd) || 0,
      ok: Boolean(data.ok),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  } catch {
    return null;
  }
}

async function writeCache(
  id: string,
  network: Network,
  tokenAddress: string,
  walletAddress: string,
  row: CacheRow,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase
      .from('whale_portfolio_cache')
      .upsert(
        {
          id,
          network,
          token_address: tokenAddress.toLowerCase(),
          wallet_address: walletAddress.toLowerCase(),
          total_tokens_held: row.totalTokensHeld,
          token_price_usd: row.tokenPriceUsd,
          total_position_value_usd: row.totalPositionValueUsd,
          ok: row.ok,
          updated_at: new Date(row.updatedAt).toISOString(),
        },
        { onConflict: 'id' },
      );
  } catch (err) {
    console.error('[whales/portfolio] cache write failed:', err);
  }
}

function isFresh(row: CacheRow): boolean {
  const age = Date.now() - row.updatedAt;
  return row.ok ? age < FRESH_TTL_MS : age < NEGATIVE_TTL_MS;
}

function encodeBalanceOfCall(walletAddress: string): string {
  const sigHash = '0x70a08231';
  const cleanWallet = walletAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  return sigHash + cleanWallet;
}

async function evmTokenBalance(
  network: Network,
  tokenAddress: string,
  walletAddress: string,
): Promise<number> {
  const rpc = EVM_RPC[network];
  if (!rpc) return 0;
  const data = encodeBalanceOfCall(walletAddress);
  try {
    const [res, decimals] = await Promise.all([
      fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: tokenAddress, data }, 'latest'],
        }),
        signal: AbortSignal.timeout(10_000),
      }),
      getTokenDecimals(network, tokenAddress),
    ]);
    if (!res.ok) return 0;
    const json = (await res.json()) as Record<string, unknown>;
    const result = json.result as string | undefined;
    if (!result || result === '0x') return 0;
    const hex = result.startsWith('0x') ? result.slice(2) : result;
    const raw = BigInt('0x' + hex);
    return Number(raw) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

async function tonJettonBalance(walletAddress: string, tokenAddress: string): Promise<number> {
  try {
    const [res, decimals] = await Promise.all([
      fetch(
        `${TONAPI_BASE}/accounts/${walletAddress}/jettons/${tokenAddress}`,
        { headers: tonApiHeaders(), signal: AbortSignal.timeout(10_000) },
      ),
      getTokenDecimals('TON', tokenAddress),
    ]);
    if (!res.ok) return 0;
    const json = (await res.json()) as Record<string, unknown>;
    const balance = json.balance as string | undefined;
    if (!balance) return 0;
    const raw = BigInt(balance);
    return Number(raw) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

function getTokenPriceFromCache(network: Network, tokenAddress: string): number {
  const cache = getCachedData();
  if (!cache?.tokens) return 0;
  const token = cache.tokens.find(
    (t) => t.network === network && t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
  return token?.price ?? 0;
}

async function fetchSnapshot(
  network: Network,
  tokenAddress: string,
  walletAddress: string,
): Promise<CacheRow> {
  const totalTokensHeld =
    network === 'TON'
      ? await tonJettonBalance(walletAddress, tokenAddress)
      : await evmTokenBalance(network, tokenAddress, walletAddress);

  const tokenPriceUsd = getTokenPriceFromCache(network, tokenAddress);
  const totalPositionValueUsd = Math.round(totalTokensHeld * tokenPriceUsd * 100) / 100;

  return {
    totalTokensHeld,
    tokenPriceUsd,
    totalPositionValueUsd,
    ok: totalTokensHeld > 0 || tokenPriceUsd > 0,
    updatedAt: Date.now(),
  };
}

async function loadSnapshotWithDedup(
  network: Network,
  tokenAddress: string,
  walletAddress: string,
): Promise<CacheRow> {
  const id = cacheKey(network, tokenAddress, walletAddress);

  const fromDb = await readCache(id);
  if (fromDb && isFresh(fromDb)) return fromDb;

  const existing = inflight.get(id);
  if (existing) return existing;

  const task = (async () => {
    try {
      const snapshot = await fetchSnapshot(network, tokenAddress, walletAddress);
      await writeCache(id, network, tokenAddress, walletAddress, snapshot);
      return snapshot;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, task);
  return task;
}

function buildAiVerdict(
  totalTokensHeld: number,
  tradeAmountUsd: number,
  tradeType: 'buy' | 'sell',
  totalPositionValueUsd: number,
  lang: string,
): string {
  const isRu = lang === 'RU';
  if (totalTokensHeld <= 0) {
    return isRu
      ? 'Кит сбросил позицию — токен на балансе не обнаружен.'
      : 'Whale has exited — no token balance detected.';
  }
  const positionVsTrade =
    tradeAmountUsd > 0 ? totalPositionValueUsd / tradeAmountUsd : 0;

  if (tradeType === 'sell') {
    if (totalPositionValueUsd < tradeAmountUsd * 0.5) {
      return isRu
        ? 'Кит активно распродаёт — основная позиция ликвидирована.'
        : 'Whale is actively dumping — core position liquidated.';
    }
    return isRu
      ? 'Кит частично зафиксировал прибыль, но держит крупный остаток.'
      : 'Whale partially took profit, retains a large residual position.';
  }

  if (positionVsTrade > 5) {
    return isRu
      ? 'Кит накапливает — эта сделка дополняет уже крупную позицию.'
      : 'Whale is accumulating — this trade adds to an already large position.';
  }
  return isRu
    ? 'Кит открыл новую позицию — ранний этап накопления.'
    : 'Whale opened a new position — early accumulation phase.';
}

export async function GET(req: NextRequest) {
  const authUser = await requireTelegramUser(req);
  if (!authUser) return unauthorized();

  const url = new URL(req.url);
  const wallet = url.searchParams.get('wallet');
  const token = url.searchParams.get('token');
  const networkParam = url.searchParams.get('network');
  const tradeAmount = parseFloat(url.searchParams.get('trade_usd') ?? '0') || 0;
  const tradeType = (url.searchParams.get('trade_type') as 'buy' | 'sell') ?? 'buy';
  const lang = url.searchParams.get('lang') === 'RU' ? 'RU' : 'EN';

  if (!wallet || !token || !networkParam) {
    return NextResponse.json(
      { ok: false, error: 'Missing required params: wallet, token, network' } as Partial<PortfolioResponse>,
      { status: 400 },
    );
  }

  const network = networkParam as Network;
  if (!['TON', 'BSC', 'BASE'].includes(network)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid network' } as Partial<PortfolioResponse>,
      { status: 400 },
    );
  }

  const snapshot = await loadSnapshotWithDedup(network, token, wallet);
  const totalPositionValueUsd = snapshot.totalPositionValueUsd;

  const aiVerdict = buildAiVerdict(
    snapshot.totalTokensHeld,
    tradeAmount,
    tradeType,
    totalPositionValueUsd,
    lang,
  );

  const cacheAgeSeconds = Math.max(0, Math.round((Date.now() - snapshot.updatedAt) / 1000));

  const response: PortfolioResponse = {
    ok: true,
    wallet_address: wallet,
    token_address: token,
    network,
    trade_amount_usd: tradeAmount,
    total_tokens_held: snapshot.totalTokensHeld,
    total_position_value_usd: totalPositionValueUsd,
    token_price_usd: snapshot.tokenPriceUsd,
    ai_verdict: aiVerdict,
    cache_hit: cacheAgeSeconds > 0,
    cache_age_seconds: cacheAgeSeconds,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
