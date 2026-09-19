import { TONAPI_BASE, tonApiHeaders } from '@/lib/tonapi';
import { getSupabase } from '@/lib/supabase-server';
import type { TonMintStatus, TonOwnerStatus, TonSafetyDetails } from '@/lib/types';

const GECKO_TERMINAL_BASE = 'https://api.geckoterminal.com/api/v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SYSTEM_CONTRACTS_REFRESH_MS = 30 * 60 * 1000;

const RENOUNCED_TON_ADMINS = new Set<string>([
  '',
  '0:0000000000000000000000000000000000000000000000000000000000000000',
  'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIFm',
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ1S',
]);

let systemContractsCache: Set<string> | null = null;
let systemContractsFetchedAt = 0;

async function loadSystemContracts(): Promise<Set<string>> {
  const now = Date.now();
  if (systemContractsCache && now - systemContractsFetchedAt < SYSTEM_CONTRACTS_REFRESH_MS) {
    return systemContractsCache;
  }
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('ton_system_contracts')
      .select('address')
      .eq('is_active', true);
    const set = new Set<string>();
    if (Array.isArray(data)) {
      for (const row of data as { address: string }[]) {
        if (row.address) set.add(row.address);
      }
    }
    systemContractsCache = set;
    systemContractsFetchedAt = now;
    return set;
  } catch {
    if (systemContractsCache) return systemContractsCache;
    return new Set();
  }
}

export interface TonHolder {
  address: string;
  percent: number;
}

interface TonJettonRaw {
  mintable: boolean;
  adminAddress: string | null;
  totalHolders: number;
  verified: boolean;
  createdAtMs: number | null;
  symbol: string;
}

async function fetchJettonMasterRaw(address: string): Promise<TonJettonRaw | null> {
  try {
    const res = await fetch(`${TONAPI_BASE}/jettons/${address}`, {
      headers: tonApiHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const admin = (json?.admin ?? json?.admin_address ?? json?.metadata?.admin_address ?? null) as
      | string
      | { address?: string }
      | null;
    const adminAddress =
      typeof admin === 'string' ? admin : admin?.address ?? null;
    const mintable = Boolean(json?.mintable ?? json?.metadata?.mintable ?? false);
    const totalHolders = Number(json?.holders_count ?? 0) || 0;
    const verification = String(json?.verification ?? 'none').toLowerCase();
    const verified = verification === 'whitelist' || verification === 'verified';
    const symbol = String(json?.metadata?.symbol ?? json?.symbol ?? '').slice(0, 12);
    return {
      mintable,
      adminAddress,
      totalHolders,
      verified,
      createdAtMs: null,
      symbol,
    };
  } catch {
    return null;
  }
}

async function fetchJettonHoldersRaw(address: string): Promise<TonHolder[]> {
  try {
    const res = await fetch(`${TONAPI_BASE}/jettons/${address}/holders?limit=20`, {
      headers: tonApiHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rawList: unknown = json?.holders;
    if (!Array.isArray(rawList)) return [];
    const result: TonHolder[] = [];
    for (const h of rawList as Array<Record<string, unknown>>) {
      const pct = parseFloat(String(h?.percentage ?? h?.percent ?? '0')) || 0;
      const ownerObj = h?.owner as { address?: string } | string | undefined;
      const rawAddress =
        typeof ownerObj === 'string'
          ? ownerObj
          : ownerObj?.address ?? (h?.address as string | undefined) ?? '';
      if (pct > 0 && rawAddress) {
        result.push({ address: rawAddress, percent: pct });
      }
    }
    return result;
  } catch {
    return [];
  }
}

interface TonPoolInfo {
  dex: string;
  reserveUsd: number;
}

async function fetchTonPools(address: string): Promise<TonPoolInfo[]> {
  try {
    const res = await fetch(
      `${GECKO_TERMINAL_BASE}/networks/ton/tokens/${address}/pools?page=1`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const pools: unknown = json?.data;
    if (!Array.isArray(pools)) return [];

    const included: Array<Record<string, unknown>> = Array.isArray(json?.included)
      ? (json.included as Array<Record<string, unknown>>)
      : [];
    const dexById = new Map<string, string>();
    for (const inc of included) {
      if (inc?.type === 'dex' && typeof inc.id === 'string') {
        const name = (inc.attributes as { name?: string } | undefined)?.name;
        dexById.set(inc.id, (name || inc.id).toLowerCase());
      }
    }

    const results: TonPoolInfo[] = [];
    for (const pool of pools as Array<Record<string, unknown>>) {
      const attrs = (pool?.attributes as Record<string, unknown>) ?? {};
      const relDex = (pool?.relationships as { dex?: { data?: { id?: string } } } | undefined)?.dex?.data?.id;
      const dexName = relDex ? dexById.get(relDex) ?? relDex : 'unknown';
      const reserveUsd = parseFloat(String(attrs.reserve_in_usd ?? '0')) || 0;
      results.push({ dex: dexName, reserveUsd });
    }
    return results;
  } catch {
    return [];
  }
}

export interface TonScannerOutput {
  details: TonSafetyDetails;
  tokenSymbol: string;
  totalHolders: number;
  filteredTopHolders: TonHolder[];
  adminAddress: string | null;
  cached: boolean;
}

function scoreFromSignals(signals: {
  mintable: boolean;
  ownerActive: boolean;
  verified: boolean;
  lpTotalUsd: number;
  poolCount: number;
  nonSystemTop3Sum: number;
  jettonAgeDays: number | null;
}): number {
  let score = 0;
  if (signals.mintable) score += 25;
  if (signals.ownerActive) score += 20;
  if (!signals.verified) score += 15;
  if (signals.poolCount === 0) score += 25;
  else if (signals.lpTotalUsd < 5000) score += 15;
  if (signals.nonSystemTop3Sum > 40) score += 15;
  if (signals.jettonAgeDays !== null && signals.jettonAgeDays < 7) score += 10;
  return Math.min(100, score);
}

async function loadFromCache(address: string): Promise<TonScannerOutput | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('ton_safety_cache')
      .select('*')
      .eq('master_address', address)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.updated_at as string).getTime();
    if (age > CACHE_TTL_MS) return null;
    const raw = (data.raw_signals as Record<string, unknown>) ?? {};
    return {
      details: {
        score: (data.score as number) ?? 0,
        mintStatus: (data.mint_status as TonMintStatus) ?? 'unknown',
        ownerStatus: (data.owner_status as TonOwnerStatus) ?? 'unknown',
        lpTotalUsd: Number(data.lp_total_usd) || 0,
        lpDexList: Array.isArray(data.lp_dex_list) ? (data.lp_dex_list as string[]) : [],
        nonSystemTopHolderPct: Number(data.non_system_top_holder_pct) || 0,
        jettonAgeDays: (data.jetton_age_days as number | null) ?? null,
        verifiedByTonapi: Boolean(data.verified_by_tonapi),
      },
      tokenSymbol: (raw.symbol as string) ?? 'UNKNOWN',
      totalHolders: (raw.totalHolders as number) ?? 0,
      filteredTopHolders: Array.isArray(raw.filteredTopHolders)
        ? (raw.filteredTopHolders as TonHolder[])
        : [],
      adminAddress: (raw.adminAddress as string | null) ?? null,
      cached: true,
    };
  } catch {
    return null;
  }
}

async function saveToCache(address: string, out: TonScannerOutput): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('ton_safety_cache').upsert(
      {
        master_address: address,
        score: out.details.score,
        mint_status: out.details.mintStatus,
        owner_status: out.details.ownerStatus,
        lp_total_usd: out.details.lpTotalUsd,
        lp_dex_list: out.details.lpDexList,
        non_system_top_holder_pct: out.details.nonSystemTopHolderPct,
        jetton_age_days: out.details.jettonAgeDays,
        verified_by_tonapi: out.details.verifiedByTonapi,
        raw_signals: {
          symbol: out.tokenSymbol,
          totalHolders: out.totalHolders,
          filteredTopHolders: out.filteredTopHolders.slice(0, 10),
          adminAddress: out.adminAddress,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'master_address' },
    );
  } catch {
    // best-effort
  }
}

export async function auditTonJetton(address: string): Promise<TonScannerOutput | null> {
  const cached = await loadFromCache(address);
  if (cached) return cached;

  const [master, holders, pools, systemContracts] = await Promise.all([
    fetchJettonMasterRaw(address),
    fetchJettonHoldersRaw(address),
    fetchTonPools(address),
    loadSystemContracts(),
  ]);

  if (!master) return null;

  const filteredTopHolders = holders.filter((h) => !systemContracts.has(h.address));
  const nonSystemTop3Sum = filteredTopHolders
    .slice(0, 3)
    .reduce((acc, h) => acc + h.percent, 0);
  const nonSystemTopHolderPct = filteredTopHolders[0]?.percent ?? 0;

  const lpTotalUsd = pools.reduce((acc, p) => acc + p.reserveUsd, 0);
  const lpDexList = Array.from(new Set(pools.map((p) => p.dex))).filter(Boolean);

  const mintStatus: TonMintStatus = master.mintable ? 'mintable' : 'not_mintable';
  const adminNorm = (master.adminAddress ?? '').trim();
  const ownerActive = !!adminNorm && !RENOUNCED_TON_ADMINS.has(adminNorm);
  const ownerStatus: TonOwnerStatus = adminNorm === ''
    ? 'unknown'
    : ownerActive
      ? 'active_admin'
      : 'renounced';

  const score = scoreFromSignals({
    mintable: master.mintable,
    ownerActive,
    verified: master.verified,
    lpTotalUsd,
    poolCount: pools.length,
    nonSystemTop3Sum,
    jettonAgeDays: null,
  });

  const output: TonScannerOutput = {
    details: {
      score,
      mintStatus,
      ownerStatus,
      lpTotalUsd,
      lpDexList,
      nonSystemTopHolderPct,
      jettonAgeDays: null,
      verifiedByTonapi: master.verified,
    },
    tokenSymbol: master.symbol || 'UNKNOWN',
    totalHolders: master.totalHolders,
    filteredTopHolders,
    adminAddress: master.adminAddress,
    cached: false,
  };

  await saveToCache(address, output);
  return output;
}
