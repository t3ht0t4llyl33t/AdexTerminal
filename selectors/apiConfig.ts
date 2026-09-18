import type { TokenRow, WhaleAlert, SecurityScan } from '@/lib/types';
import { getSupabase } from '@/lib/supabase-server';
import { filterWhaleTrades, type RawTrade } from '@/lib/whale-filters';

export const GECKO_TERMINAL_BASE = 'https://api.geckoterminal.com/api/v2';
export const POLL_INTERVAL_MS = 60_000;

const MIN_LIQUIDITY_USD = 1_000;
const MIN_SPIKE_PCT = 20;
const MAX_TOKENS_PER_NETWORK = 20;
const MAX_TRADE_POOLS_PER_NETWORK = 24;
const WINDOW_15M_MS = 15 * 60 * 1000;
const TRADES_SPACING_MS = 350;
const WHALE_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_WHALES = 150;

export type NetworkKey = 'TON' | 'BSC' | 'BASE';
const NETWORK_ORDER: NetworkKey[] = ['TON', 'BSC', 'BASE'];
const NETWORK_IDS: Record<NetworkKey, string> = { TON: 'ton', BSC: 'bsc', BASE: 'base' };
const NETWORK_NATIVE: Record<NetworkKey, string> = { TON: 'TON', BSC: 'BNB', BASE: 'ETH' };

export interface CachedData {
  tokens: TokenRow[];
  whales: WhaleAlert[];
  scans: SecurityScan[];
  timestamp: number;
  source: 'cache' | 'live' | 'mock';
}

declare global {
  var adexCache: CachedData | undefined;
  var adexPollingActive: boolean | undefined;
  var adexNetworkCursor: number | undefined;
}

export function getCachedData(): CachedData | undefined {
  return globalThis.adexCache;
}

export function setCachedData(data: CachedData): void {
  globalThis.adexCache = data;
}

export function isPollingActive(): boolean {
  return globalThis.adexPollingActive === true;
}

export function setPollingActive(active: boolean): void {
  globalThis.adexPollingActive = active;
}

export function isProCoinGeckoConfigured(): boolean {
  return !!process.env.PRO_COINGECKO_API_KEY;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
}

function buildTokenMap(included: unknown[]): Map<string, TokenInfo> {
  const map = new Map<string, TokenInfo>();
  if (!Array.isArray(included)) return map;
  for (const item of included) {
    const it = item as Record<string, unknown>;
    if (it?.type !== 'token') continue;
    const id = it.id as string;
    const attrs = (it.attributes ?? {}) as Record<string, unknown>;
    map.set(id, {
      address: (attrs.address as string) ?? id,
      symbol: (attrs.symbol as string) ?? 'UNKNOWN',
      name: (attrs.name as string) ?? (attrs.symbol as string) ?? 'Unknown',
    });
  }
  return map;
}

function extractTokenAddressFromId(id: string, network: string): string {
  const prefix = `${network}_`;
  if (id.startsWith(prefix)) {
    return id.slice(prefix.length);
  }
  return id;
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[radar] ${url} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error(`[radar] ${url} failed:`, err);
    return null;
  }
}

interface NetworkSnapshot {
  tokens: TokenRow[];
  whales: WhaleAlert[];
}

async function fetchNetworkSnapshot(
  network: NetworkKey,
  previousTokens: TokenRow[],
): Promise<NetworkSnapshot | null> {
  const networkId = NETWORK_IDS[network];
  const json = await fetchJson(
    `${GECKO_TERMINAL_BASE}/networks/${networkId}/trending_pools?page=1&include=base_token`,
  );
  if (!json) return null;

  const pools = (json.data as Record<string, unknown>[] | undefined) ?? [];
  const tokenMap = buildTokenMap((json.included as unknown[] | undefined) ?? []);

  const candidates: Record<string, unknown>[] = [];
  for (const pool of pools) {
    const attrs = (pool.attributes ?? {}) as Record<string, unknown>;
    const liquidity =
      parseFloat(attrs.reserve_in_usd as string ?? '0') ||
      parseFloat(attrs.total_value_locked_usd as string ?? '0') ||
      0;
    if (liquidity < MIN_LIQUIDITY_USD) continue;

    const txns = attrs.transactions as Record<string, Record<string, number>> | undefined;
    const h24Buys = txns?.h24?.buys ?? 0;
    const h24Buyers = txns?.h24?.buyers ?? 0;
    if (h24Buyers < 2) continue;
    if (h24Buys >= 20 && h24Buyers / h24Buys < 0.05) continue;

    candidates.push(pool);
    if (candidates.length >= MAX_TRADE_POOLS_PER_NETWORK) break;
  }

  const now = Date.now();
  const tokens: TokenRow[] = [];
  const whales: WhaleAlert[] = [];
  const previousByPool = new Map(previousTokens.map((t) => [t.id, t]));

  for (let c = 0; c < candidates.length; c++) {
    const pool = candidates[c];
    const attrs = (pool.attributes ?? {}) as Record<string, unknown>;
    const poolAddress =
      (attrs.address as string) || extractTokenAddressFromId(pool.id as string, networkId);

    const relationships = (pool.relationships ?? {}) as Record<string, unknown>;
    const baseTokenRel =
      ((relationships.base_token as Record<string, unknown> | undefined)?.data ?? {}) as Record<string, string>;
    const tokenInfo = tokenMap.get(baseTokenRel.id ?? '');
    const tokenAddress =
      tokenInfo?.address ?? extractTokenAddressFromId(baseTokenRel.id ?? '', networkId);
    const poolName = (attrs.name as string) ?? '';
    const symbol = tokenInfo?.symbol ?? poolName.split('/')[0]?.trim() ?? 'UNKNOWN';
    const quoteSymbol = poolName.split('/')[1]?.trim() || NETWORK_NATIVE[network];

    const vol = attrs.volume_usd as Record<string, string> | undefined;
    const h24Vol = parseFloat(vol?.h24 ?? '0') || 0;
    const h1Vol = parseFloat(vol?.h1 ?? '0') || 0;
    const priceChangePct = attrs.price_change_percentage as Record<string, string> | undefined;
    const priceChange24h = parseFloat(priceChangePct?.h24 ?? '0') || 0;
    const liquidity = parseFloat(attrs.reserve_in_usd as string ?? '0') || 0;
    const price = parseFloat(attrs.base_token_price_usd as string ?? '0') || 0;

    if (c > 0) {
      await new Promise((r) => setTimeout(r, TRADES_SPACING_MS));
    }

    const tradesJson = await fetchJson(
      `${GECKO_TERMINAL_BASE}/networks/${networkId}/pools/${poolAddress}/trades?limit=100`,
    );

    let buyVol15 = 0;
    let sellVol15 = 0;
    let buys15 = 0;
    let sells15 = 0;
    let firstPrice = 0;
    let lastPrice = 0;
    const rawTrades: RawTrade[] = [];

    if (tradesJson) {
      const trades = (tradesJson.data as Record<string, unknown>[] | undefined) ?? [];
      const windowStart = now - WINDOW_15M_MS;

      for (const trade of trades) {
        const ta = (trade.attributes ?? {}) as Record<string, unknown>;
        const ts = Date.parse(ta.block_timestamp as string ?? '');
        if (!Number.isFinite(ts) || ts < windowStart) continue;

        const usd = parseFloat(ta.volume_in_usd as string ?? '0') || 0;
        const kind = ta.kind === 'sell' ? 'sell' : 'buy';
        const toTok = parseFloat(ta.to_token_amount as string ?? '0') || 0;
        const fromTok = parseFloat(ta.from_token_amount as string ?? '0') || 0;
        const tradePrice =
          kind === 'buy' ? (toTok > 0 ? usd / toTok : 0) : fromTok > 0 ? usd / fromTok : 0;
        if (tradePrice > 0) {
          if (firstPrice === 0) firstPrice = tradePrice;
          lastPrice = tradePrice;
        }

        if (kind === 'buy') {
          buyVol15 += usd;
          buys15++;
        } else {
          sellVol15 += usd;
          sells15++;
        }

        const txHash = (ta.tx_hash as string) ?? '';
        rawTrades.push({
          kind,
          usd,
          ts,
          txHash,
          walletAddress:
            (ta.tx_from_address as string) ??
            (txHash.startsWith('0x') ? `0x${txHash.slice(2, 42)}` : txHash),
          tokenAmount: kind === 'buy' ? toTok : fromTok,
          nativeAmount: Math.round((kind === 'buy' ? fromTok : toTok) * 100) / 100,
        });
      }
    }

    let whaleBuy15 = 0;
    let whaleSell15 = 0;
    for (const trade of filterWhaleTrades(rawTrades)) {
      if (trade.kind === 'buy') whaleBuy15 += trade.usd;
      else whaleSell15 += trade.usd;
      whales.push({
        id: `${network}-${trade.txHash}-${trade.kind}`,
        tokenSymbol: symbol,
        network,
        type: trade.kind,
        amountUsd: Math.round(trade.usd),
        amountTokens: Math.round(trade.tokenAmount),
        nativeAmount: Math.round(trade.nativeAmount * 100) / 100,
        nativeCurrency: quoteSymbol,
        timestamp: trade.ts,
        txHash: trade.txHash,
        walletAddress: trade.walletAddress,
        walletLabel: `${network} Whale`,
        crossChainWallet: false,
        insiderDistribution: false,
        tokenAddress,
      });
    }
    const whaleInsiderSell = whaleSell15 > whaleBuy15 * 1.5;
    for (const w of whales) {
      if (w.network === network && w.tokenAddress === tokenAddress && w.type === 'sell') {
        w.insiderDistribution = whaleInsiderSell;
      }
    }

    const volume15 = buyVol15 + sellVol15;
    const totalTx = buys15 + sells15;
    const expected15 = h1Vol > 0 ? h1Vol / 4 : h24Vol > 0 ? h24Vol / 96 : 0;

    let spike = expected15 > 0 ? Math.round(((volume15 - expected15) / expected15) * 100) : 0;
    spike = Math.max(0, spike);

    let buyPressure = 50;
    if (totalTx > 0) {
      buyPressure = Math.round((buys15 / totalTx) * 100);
    } else {
      const prev = previousByPool.get((pool.id as string) ?? '');
      if (prev) buyPressure = prev.buyPressure15m;
    }

    let priceChange = priceChange24h;
    if (totalTx > 0 && firstPrice > 0 && lastPrice > 0) {
      priceChange = Math.round(((lastPrice - firstPrice) / firstPrice) * 1000) / 10;
    } else {
      const prev = previousByPool.get((pool.id as string) ?? '');
      if (prev && prev.priceChange24h !== 0) priceChange = prev.priceChange24h;
    }

    tokens.push({
      id: (pool.id as string) ?? `${network}-${tokens.length}`,
      symbol,
      name: tokenInfo?.name ?? symbol,
      address: tokenAddress,
      network,
      volume24h: h24Vol,
      volumeSpike15m: spike,
      buyPressure15m: buyPressure,
      sellPressure15m: 100 - buyPressure,
      whaleSellVolume15m: Math.round(whaleSell15),
      whaleBuyVolume15m: Math.round(whaleBuy15),
      lpLocked: false,
      devCluster: false,
      liquidity,
      price,
      priceChange24h: priceChange,
    });
  }

  tokens.sort((a, b) => b.volumeSpike15m - a.volumeSpike15m);
  whales.sort((a, b) => b.timestamp - a.timestamp);
  return { tokens: tokens.filter((t) => t.volumeSpike15m >= MIN_SPIKE_PCT).slice(0, MAX_TOKENS_PER_NETWORK), whales };
}

async function loadDbCache(): Promise<{ tokens: TokenRow[]; whales: WhaleAlert[] } | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('radar_cache')
      .select('tokens, whales')
      .eq('id', 'latest')
      .maybeSingle();
    if (error || !data) return null;
    return {
      tokens: (data.tokens as TokenRow[]) ?? [],
      whales: (data.whales as WhaleAlert[]) ?? [],
    };
  } catch {
    return null;
  }
}

async function saveDbCache(tokens: TokenRow[], whales: WhaleAlert[]): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase
      .from('radar_cache')
      .upsert(
        { id: 'latest', tokens, whales, source: 'live', updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
  } catch (err) {
    console.error('[radar] DB save error:', err);
  }
}

function mergeTokens(previous: TokenRow[], fresh: TokenRow[], network: NetworkKey): TokenRow[] {
  const kept = previous.filter((t) => t.network !== network);
  const perNetwork = new Map<NetworkKey, TokenRow[]>();
  for (const row of [...fresh, ...kept]) {
    const list = perNetwork.get(row.network) ?? [];
    list.push(row);
    perNetwork.set(row.network, list);
  }
  const merged: TokenRow[] = [];
  for (const net of NETWORK_ORDER) {
    const list = perNetwork.get(net) ?? [];
    list.sort((a, b) => b.volumeSpike15m - a.volumeSpike15m);
    merged.push(...list.filter((t) => t.volumeSpike15m >= MIN_SPIKE_PCT).slice(0, MAX_TOKENS_PER_NETWORK));
  }
  return merged;
}

function mergeWhales(previous: WhaleAlert[], fresh: WhaleAlert[]): WhaleAlert[] {
  const byId = new Map<string, WhaleAlert>();
  const cutoff = Date.now() - WHALE_RETENTION_MS;
  for (const w of [...previous, ...fresh]) {
    if (w.timestamp < cutoff) continue;
    byId.set(w.id, w);
  }
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_WHALES);
}

async function refreshNextNetwork(): Promise<CachedData | null> {
  const cursor = globalThis.adexNetworkCursor ?? 0;
  globalThis.adexNetworkCursor = cursor + 1;
  const network = NETWORK_ORDER[cursor % NETWORK_ORDER.length];
  const previous = getCachedData();

  const snapshot = await fetchNetworkSnapshot(network, previous?.tokens ?? []);
  if (!snapshot) return null;

  const base = previous ?? (await loadDbCache());
  const tokens = mergeTokens(base?.tokens ?? [], snapshot.tokens, network);
  const whales = mergeWhales(base?.whales ?? [], snapshot.whales);

  const data: CachedData = { tokens, whales, scans: [], timestamp: Date.now(), source: 'live' };
  setCachedData(data);
  await saveDbCache(tokens, whales);
  console.log(
    `[radar] ${network}: ${snapshot.tokens.length} tokens, ${snapshot.whales.length} whale alerts (total ${tokens.length}/${whales.length})`,
  );
  return data;
}

export async function fetchRadarData(): Promise<CachedData> {
  const cached = getCachedData();
  if (cached && Date.now() - cached.timestamp < POLL_INTERVAL_MS * 2) {
    return cached;
  }

  const db = await loadDbCache();
  if (db && (db.tokens.length > 0 || db.whales.length > 0)) {
    const data: CachedData = {
      tokens: db.tokens,
      whales: db.whales,
      scans: [],
      timestamp: Date.now(),
      source: 'live',
    };
    setCachedData(data);
    return data;
  }

  const refreshed = await refreshNextNetwork();
  if (refreshed) return refreshed;

  return { tokens: [], whales: [], scans: [], timestamp: Date.now(), source: 'live' };
}

export function getWhalesFromCache(): WhaleAlert[] {
  return getCachedData()?.whales ?? [];
}

export async function startPollingLoop(): Promise<void> {
  if (isPollingActive()) return;
  if (isProCoinGeckoConfigured()) return;

  setPollingActive(true);

  (async () => {
    while (isPollingActive() && !isProCoinGeckoConfigured()) {
      try {
        await refreshNextNetwork();
      } catch (err) {
        console.error('[radar] refresh error:', err);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  })();
}
