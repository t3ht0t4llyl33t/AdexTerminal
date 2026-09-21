import { NextRequest, NextResponse } from 'next/server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { getSupabase } from '@/lib/supabase-server';
import { cachedJson } from '@/lib/edge-cache';
import { auditTonJetton, TonScanError, validateTonAddress } from '@/lib/ton-scanner';
import type { SecurityScan, Network } from '@/lib/types';

const GECKO_TERMINAL_BASE = 'https://api.geckoterminal.com/api/v2';
const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TTL_MS = 5 * 60 * 1000;
const DB_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const DAILY_FREE_LIMIT = 10;
const BONUS_SCANS = 5;
const COLLAPSE_WINDOW_MS = 3000;
const MAX_INMEMORY_ENTRIES = 500;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface AuditResult {
  scan: SecurityScan;
  verdictKey: 'scanner.verdictSafe' | 'scanner.verdictCaution' | 'scanner.verdictDanger';
  devClusterAlertKey: 'scanner.devClusterAlert' | null;
  insiderWeight: number;
}

function computeDevClusterSeverity(topHolderPercent: number): SecurityScan['devClusterSeverity'] {
  if (topHolderPercent >= 5) return 'danger';
  if (topHolderPercent >= 1) return 'warning';
  return 'safe';
}

interface CacheEntry {
  result: AuditResult;
  expiresAt: number;
}

interface PendingRequest {
  promise: Promise<AuditResult>;
  expiresAt: number;
}

declare global {
  var scannerCache: Map<string, CacheEntry> | undefined;
  var scannerPending: Map<string, PendingRequest> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!globalThis.scannerCache) globalThis.scannerCache = new Map();
  return globalThis.scannerCache;
}

function getPending(): Map<string, PendingRequest> {
  if (!globalThis.scannerPending) globalThis.scannerPending = new Map();
  return globalThis.scannerPending;
}

function detectNetwork(address: string): Network {
  if (address.startsWith('EQ') || address.startsWith('UQ')) return 'TON';
  if (address.startsWith('0x')) {
    return 'BASE';
  }
  return 'BASE';
}

interface HolderInfo {
  address: string;
  percent: number;
}

interface GoPlusData {
  buyTax: number;
  sellTax: number;
  isHoneypot: boolean;
  isOpenSource: boolean;
  isProxy: boolean;
  canRenounce: boolean;
  ownerRenounced: boolean;
  hiddenOwner: boolean;
  cannotSellAll: boolean;
  isMintable: boolean;
  totalHolders: number;
  topHolderPercent: number;
  topHolders: HolderInfo[];
  lpLocked: boolean;
  lpLockPercent: number;
  lpLockedUntil: string | null;
  devCluster: boolean;
  devWalletCount: number;
  riskScore: number;
}

const RENOUNCED_OWNERS = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
]);

function isRenouncedAddress(address: string | null | undefined): boolean {
  return !!address && RENOUNCED_OWNERS.has(address.toLowerCase());
}

async function fetchGoPlusSecurity(address: string, network: Network, chainId?: string): Promise<GoPlusData | null> {
  if (network === 'TON') return null;

  const cid = chainId ?? (network === 'BSC' ? '56' : '8453');

  try {
    const res = await fetch(
      `${GOPLUS_BASE}/token_security/${cid}?contract_addresses=${address}`,
      { signal: AbortSignal.timeout(8000) },
    );

    if (!res.ok) {
      console.error(`[scanner] GoPlus error ${res.status} for ${address}`);
      return null;
    }

    const json = await res.json();
    const data = json?.result?.[address?.toLowerCase()];
    if (!data) return null;

    const buyTax = parseFloat(data.buy_tax ?? '0') || 0;
    const sellTax = parseFloat(data.sell_tax ?? '0') || 0;
    const isHoneypot = data.is_honeypot === '1';
    const isOpenSource = data.is_open_source === '1';
    const isProxy = data.is_proxy === '1';
    const canRenounce = data.can_take_back_ownership === '1';
    const ownerRenounced = isRenouncedAddress(data.owner_address);
    const hiddenOwner = data.hidden_owner === '1';
    const cannotSellAll = data.cannot_sell_all === '1';
    const isMintable = data.is_mintable === '1';
    const totalHolders = parseInt(data.holder_count ?? '0', 10) || 0;

    let lpLocked = false;
    let lpLockPercent = 0;
    let lpLockedUntil: string | null = null;

    if (data.lp_holders && Array.isArray(data.lp_holders) && data.lp_holders.length > 0) {
      const lockedLPs = data.lp_holders.filter(
        (h: { is_locked?: string; locked_detail?: unknown }) => h.is_locked === '1' || h.locked_detail,
      );
      if (lockedLPs.length > 0) {
        lpLocked = true;
        const totalLP = data.lp_holders.reduce(
          (sum: number, h: { percent?: string }) => sum + (parseFloat(h.percent ?? '0') || 0),
          0,
        );
        const lockedLP = lockedLPs.reduce(
          (sum: number, h: { percent?: string }) => sum + (parseFloat(h.percent ?? '0') || 0),
          0,
        );
        lpLockPercent = totalLP > 0 ? Math.round((lockedLP / totalLP) * 100) : 100;

        const firstLocked = lockedLPs[0] as { locked_detail?: string };
        if (firstLocked?.locked_detail) {
          const dateMatch = firstLocked.locked_detail.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) lpLockedUntil = dateMatch[1];
        }
      }
    }

    const topHolders: HolderInfo[] = [];
    if (data.holders && Array.isArray(data.holders)) {
      for (const h of data.holders) {
        const pct = parseFloat(h.percent ?? h.percentage ?? '0') || 0;
        if (pct > 0) {
          topHolders.push({ address: h.address ?? '', percent: pct });
        }
      }
    }

    const topHolderPercent = topHolders.length > 0 ? topHolders[0].percent : 0;

    let riskScore = 0;
    if (isHoneypot) riskScore += 40;
    if (!isOpenSource) riskScore += 20;
    if (isProxy) riskScore += 15;
    if (hiddenOwner) riskScore += 15;
    if (cannotSellAll) riskScore += 20;
    if (isMintable) riskScore += 10;
    if (buyTax > 10) riskScore += 10;
    if (sellTax > 10) riskScore += 10;
    if (!lpLocked) riskScore += 10;
    if (topHolderPercent > 20) riskScore += 10;
    riskScore = Math.min(100, riskScore);

    const devCluster = hiddenOwner || isMintable || (!isOpenSource && !ownerRenounced);

    let devWalletCount = 0;
    if (devCluster && topHolders.length > 0) {
      devWalletCount = topHolders
        .filter((h) => h.percent >= 5)
        .slice(0, 10)
        .length;
      if (devWalletCount === 0 && topHolders.length > 0) devWalletCount = 1;
    }

    return {
      buyTax: Math.round(buyTax * 100),
      sellTax: Math.round(sellTax * 100),
      isHoneypot,
      isOpenSource,
      isProxy,
      canRenounce,
      ownerRenounced,
      hiddenOwner,
      cannotSellAll,
      isMintable,
      totalHolders,
      topHolderPercent,
      topHolders,
      lpLocked,
      lpLockPercent,
      lpLockedUntil,
      devCluster,
      devWalletCount,
      riskScore,
    };
  } catch (err) {
    console.error(`[scanner] GoPlus fetch failed for ${address}:`, err);
    return null;
  }
}

async function fetchGoPlusForEvm(address: string): Promise<GoPlusData | null> {
  for (const [network, chainId] of [['BSC', '56'], ['BASE', '8453']] as const) {
    const result = await fetchGoPlusSecurity(address, network as Network, chainId);
    if (result) return result;
  }
  return null;
}


async function fetchTokenSymbol(address: string, network: Network): Promise<string> {
  const networkId = network === 'TON' ? 'ton' : network === 'BSC' ? 'bsc' : 'base';
  try {
    const res = await fetch(
      `${GECKO_TERMINAL_BASE}/networks/${networkId}/tokens/${address}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return 'UNKNOWN';
    const json = await res.json();
    const attrs = json?.data?.attributes;
    if (attrs?.symbol) return attrs.symbol as string;
    if (attrs?.name) return (attrs.name as string).slice(0, 10);
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

async function generateAudit(address: string): Promise<AuditResult> {
  const network = detectNetwork(address);

  let scan: SecurityScan;

  if (network !== 'TON') {
    const [tokenSymbol, goPlusData] = await Promise.all([
      fetchTokenSymbol(address, network),
      fetchGoPlusForEvm(address),
    ]);
    if (goPlusData) {
      const topPct = goPlusData.topHolderPercent;
      const devClusterSeverity = computeDevClusterSeverity(topPct);
      const devCluster = devClusterSeverity !== 'safe';
      scan = {
        id: `scan-${Date.now()}`,
        tokenSymbol,
        network,
        address,
        lpLocked: goPlusData.lpLocked,
        lpLockedUntil: goPlusData.lpLockedUntil,
        lpLockPercent: goPlusData.lpLockPercent,
        devCluster,
        devClusterSeverity,
        devWalletCount: devCluster ? Math.max(goPlusData.devWalletCount, 1) : 0,
        honeypot: goPlusData.isHoneypot,
        buyTax: goPlusData.buyTax,
        sellTax: goPlusData.sellTax,
        contractVerified: goPlusData.isOpenSource,
        canRenounce: goPlusData.canRenounce,
        ownerRenounced: goPlusData.ownerRenounced,
        totalHolders: goPlusData.totalHolders,
        topHolderPercent: topPct,
        riskScore: goPlusData.riskScore,
      };
    } else {
      throw new Error('GoPlus security API returned no data for this EVM contract');
    }
  } else {
    const [tokenSymbol, tonData] = await Promise.all([
      fetchTokenSymbol(address, network),
      auditTonJetton(address),
    ]);
    const detectedSymbol = tonData.tokenSymbol && tonData.tokenSymbol !== 'UNKNOWN'
      ? tonData.tokenSymbol
      : tokenSymbol;
    const hasPools = tonData.details.lpDexList.length > 0;
    const topPct = tonData.details.nonSystemTopHolderPct;
    const devClusterSeverity = computeDevClusterSeverity(topPct);
    const devCluster = devClusterSeverity !== 'safe';
    const concentratedNonSystem = tonData.filteredTopHolders.filter((h) => h.percent >= 1);
    const devWalletCount = devCluster ? Math.max(concentratedNonSystem.length, 1) : 0;

    scan = {
      id: `scan-${Date.now()}`,
      tokenSymbol: detectedSymbol,
      network,
      address,
      lpLocked: false,
      lpLockedUntil: null,
      lpLockPercent: 0,
      devCluster,
      devClusterSeverity,
      devWalletCount,
      honeypot: false,
      buyTax: 0,
      sellTax: 0,
      contractVerified: tonData.details.verifiedByTonapi,
      canRenounce: false,
      ownerRenounced: tonData.details.ownerStatus === 'renounced',
      totalHolders: tonData.totalHolders,
      topHolderPercent: topPct,
      riskScore: tonData.details.score,
      ton: tonData.details,
    };
    if (!hasPools) {
      scan.riskScore = Math.max(scan.riskScore, 70);
    }
  }

  let verdictKey: 'scanner.verdictSafe' | 'scanner.verdictCaution' | 'scanner.verdictDanger';
  if (scan.honeypot || scan.riskScore >= 60) {
    verdictKey = 'scanner.verdictDanger';
  } else if (network === 'TON') {
    verdictKey = scan.riskScore >= 26 ? 'scanner.verdictCaution' : 'scanner.verdictSafe';
  } else if (scan.riskScore >= 30 || !scan.lpLocked) {
    verdictKey = 'scanner.verdictCaution';
  } else {
    verdictKey = 'scanner.verdictSafe';
  }

  const devClusterAlertKey = scan.devClusterSeverity === 'danger' ? 'scanner.devClusterAlert' as const : null;
  const insiderWeight = scan.topHolderPercent;

  return { scan, verdictKey, devClusterAlertKey, insiderWeight };
}

function isDangerous(scan: SecurityScan): boolean {
  return scan.honeypot || scan.riskScore >= 60;
}

function normalizeCacheKey(address: string, network: Network): string {
  return network === 'TON' ? address.trim() : address.trim().toLowerCase();
}

async function loadFromDbCache(address: string, network: Network): Promise<AuditResult | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('scan_cache')
      .select('scan_result, verdict_key, updated_at')
      .eq('contract_address', normalizeCacheKey(address, network))
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const age = Date.now() - new Date(data.updated_at as string).getTime();
    if (age > DB_CACHE_TTL_MS) return null;

    const scan = data.scan_result as unknown as SecurityScan;

    if (network === 'TON' && !scan.ton) {
      return null;
    }

    if (!scan.devClusterSeverity) {
      scan.devClusterSeverity = computeDevClusterSeverity(scan.topHolderPercent ?? 0);
      scan.devCluster = scan.devClusterSeverity !== 'safe';
      if (!scan.devCluster) scan.devWalletCount = 0;
    }

    const verdictKey = data.verdict_key as AuditResult['verdictKey'];
    const devClusterAlertKey = scan.devClusterSeverity === 'danger' ? 'scanner.devClusterAlert' as const : null;

    return { scan, verdictKey, devClusterAlertKey, insiderWeight: scan.topHolderPercent };
  } catch {
    return null;
  }
}

async function saveToDbCache(address: string, result: AuditResult): Promise<void> {
  try {
    const supabase = getSupabase();
    const normalized = normalizeCacheKey(address, result.scan.network);
    const dangerous = isDangerous(result.scan);

    await supabase
      .from('scan_cache')
      .upsert({
        contract_address: normalized,
        network: result.scan.network,
        scan_result: result.scan as unknown as Record<string, unknown>,
        verdict_key: result.verdictKey,
        risk_score: result.scan.riskScore,
        is_dangerous: dangerous,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'contract_address' });

    if (dangerous) {
      const reason = result.scan.honeypot ? 'honeypot' : 'high_risk_score';
      await supabase
        .from('contract_blacklist')
        .upsert({
          contract_address: normalized,
          network: result.scan.network,
          risk_score: result.scan.riskScore,
          reason,
          token_symbol: result.scan.tokenSymbol,
        }, { onConflict: 'contract_address' });
    }
  } catch {
    // best-effort
  }
}

async function getAuditResult(address: string): Promise<AuditResult> {
  const cache = getCache();
  const network = detectNetwork(address);
  const normalized = normalizeCacheKey(address, network);

  // 1. In-memory cache (5 min TTL)
  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // 2. Request collapsing — concurrent identical requests share one promise
  const pending = getPending();
  const existingPending = pending.get(normalized);
  if (existingPending && existingPending.expiresAt > Date.now()) {
    return existingPending.promise;
  }

  const promise = (async () => {
    // 3. DB cache (3h TTL) — checked before calling external APIs
    const dbResult = await loadFromDbCache(address, network);
    if (dbResult) {
      cache.set(normalized, { result: dbResult, expiresAt: Date.now() + TTL_MS });
      pending.delete(normalized);
      return dbResult;
    }

    // 4. External API call — throws if no verified data available
    try {
      const result = await generateAudit(address);
      cache.set(normalized, { result, expiresAt: Date.now() + TTL_MS });

      // Evict oldest entries if cache is too large
      if (cache.size > MAX_INMEMORY_ENTRIES) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      // 5. Save to DB cache + blacklist if dangerous
      await saveToDbCache(address, result);

      return result;
    } catch (err) {
      throw err;
    } finally {
      pending.delete(normalized);
    }
  })();

  pending.set(normalized, { promise, expiresAt: Date.now() + COLLAPSE_WINDOW_MS });
  return promise;
}

async function checkDailyLimit(
  tgUserId: string,
): Promise<{ allowed: boolean; count: number; bonusScans: number }> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('scan_limits')
      .select('*')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!data) {
      return { allowed: true, count: 0, bonusScans: 0 };
    }

    const now = Date.now();
    const windowStart = new Date(data.window_start).getTime();
    const isWindowExpired = now - windowStart > 24 * 60 * 60 * 1000;

    if (isWindowExpired) {
      await supabase
        .from('scan_limits')
        .update({
          scan_count: 0,
          window_start: new Date().toISOString(),
        })
        .eq('telegram_user_id', tgUserId);
      return { allowed: true, count: 0, bonusScans: data.bonus_scans || 0 };
    }

    const totalAllowed = DAILY_FREE_LIMIT + (data.bonus_scans || 0);
    return {
      allowed: data.scan_count < totalAllowed,
      count: data.scan_count,
      bonusScans: data.bonus_scans || 0,
    };
  } catch {
    return { allowed: true, count: 0, bonusScans: 0 };
  }
}

async function incrementScanCount(tgUserId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('scan_limits')
      .select('*')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    if (!data) {
      await supabase.from('scan_limits').insert({
        telegram_user_id: tgUserId,
        scan_count: 1,
        window_start: new Date().toISOString(),
      });
    } else {
      const now = Date.now();
      const windowStart = new Date(data.window_start).getTime();
      const isWindowExpired = now - windowStart > 24 * 60 * 60 * 1000;

      await supabase
        .from('scan_limits')
        .update({
          scan_count: isWindowExpired ? 1 : data.scan_count + 1,
          window_start: isWindowExpired ? new Date().toISOString() : data.window_start,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_user_id', tgUserId);
    }
  } catch {
    // best-effort
  }
}

export async function POST(req: NextRequest) {
  const authUser = await requireTelegramUser(req);
  if (!authUser) return unauthorized();

  let trimmedAddress = '';
  try {
    const body = await req.json();
    const { address, referralToken, referrerTgId } = body as {
      address?: string;
      referralToken?: string;
      referrerTgId?: string;
    };

    if (!address || typeof address !== 'string' || address.trim().length < 10) {
      return NextResponse.json(
        { error: 'Invalid contract address' },
        { status: 400 },
      );
    }

    trimmedAddress = address.trim();
    const detectedNetwork = detectNetwork(trimmedAddress);
    if (detectedNetwork === 'TON') {
      const tonValidation = validateTonAddress(trimmedAddress);
      if (!tonValidation.ok) {
        return NextResponse.json(
          {
            error: 'Неверный TON-адрес. Ожидается 48-символьный дружелюбный адрес, начинающийся с EQ, UQ, kQ или 0Q (регистр важен).',
            reason: tonValidation.reason,
          },
          { status: 400 },
        );
      }
    }

    const tgUser = authUser.telegramUserId;

    if (referralToken && referrerTgId && tgUser !== 'anonymous') {
      try {
        const supabase = getSupabase();
        const { data: existingClaim } = await supabase
          .from('referral_claims')
          .select('id')
          .eq('referred_tg_id', tgUser)
          .maybeSingle();

        if (!existingClaim) {
          await supabase.from('referral_claims').insert({
            referrer_tg_id: referrerTgId,
            referred_tg_id: tgUser,
            referral_token: referralToken,
          });

          try {
            const { error: rpcError } = await supabase.rpc('increment_bonus_scans', {
              tg_id: tgUser,
              amount: BONUS_SCANS,
            });
            if (rpcError) throw new Error('rpc failed');
          } catch {
            await supabase
              .from('scan_limits')
              .update({
                bonus_scans: BONUS_SCANS,
                updated_at: new Date().toISOString(),
              })
              .eq('telegram_user_id', tgUser);
          }

          return NextResponse.json({
            bonusGranted: true,
            message: '+5 bonus scans granted!',
          });
        } else {
          return NextResponse.json({
            bonusGranted: false,
            message: 'Referral bonus already claimed for this account.',
          });
        }
      } catch {
        // best-effort
      }
    }

    const limitCheck = await checkDailyLimit(tgUser);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        locked: true,
        message: `Daily Free Limit Exhausted (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT})`,
        count: limitCheck.count,
        bonusScans: limitCheck.bonusScans,
      });
    }

    const result = await getAuditResult(trimmedAddress);

    await incrementScanCount(tgUser);

    try {
      const supabase = getSupabase();
      await supabase.from('scanner_audit_logs').insert({
        telegram_user_id: tgUser,
        contract_address: normalizeCacheKey(trimmedAddress, result.scan.network),
        network: result.scan.network,
        audit_result: result.scan as unknown as Record<string, unknown>,
        apex_ai_verdict: result.verdictKey,
      });
    } catch {
      // best-effort history log
    }

    return NextResponse.json({
      ...result,
      cached: getCache().has(normalizeCacheKey(trimmedAddress, result.scan.network)),
      remainingScans: DAILY_FREE_LIMIT + limitCheck.bonusScans - limitCheck.count - 1,
      totalAllowed: DAILY_FREE_LIMIT + limitCheck.bonusScans,
    });
  } catch (err) {
    if (err instanceof TonScanError) {
      try {
        const supabase = getSupabase();
        await supabase.from('scanner_audit_logs').insert({
          telegram_user_id: authUser.telegramUserId,
          contract_address: trimmedAddress.slice(0, 128),
          network: 'TON',
          audit_result: { error: err.message, code: err.code } as unknown as Record<string, unknown>,
          apex_ai_verdict: 'scanner.verdictCaution',
        });
      } catch {
        // best-effort
      }
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'tonapi_rate_limited' ? 429 : 502 },
      );
    }
    const message = err instanceof Error && err.message
      ? err.message
      : 'Scan failed. Please retry.';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const authUser = await requireTelegramUser(req);
  if (!authUser) return unauthorized();

  try {
    const url = new URL(req.url);
    const tgUserId = authUser.telegramUserId;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scanner_audit_logs')
      .select('audit_result, contract_address, network, created_at, apex_ai_verdict')
      .eq('telegram_user_id', tgUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data) {
      return cachedJson(
        req,
        { data: [], cached: false, timestamp: Date.now(), source: 'empty' },
        { sMaxAge: 30, swr: 120, staleReason: 'no_history' },
        'fallback',
      );
    }

    const scans: SecurityScan[] = data.map((row: Record<string, unknown>) => {
      const audit = row.audit_result as Record<string, unknown>;
      return {
        id: `${row.contract_address as string}-${row.created_at as string}`,
        tokenSymbol: (audit?.tokenSymbol as string) ?? 'UNKNOWN',
        network: (audit?.network as Network) ?? (row.network as Network) ?? 'TON',
        address: (row.contract_address as string) ?? '',
        lpLocked: (audit?.lpLocked as boolean) ?? false,
        lpLockedUntil: (audit?.lpLockedUntil as string | null) ?? null,
        lpLockPercent: (audit?.lpLockPercent as number) ?? 0,
        devCluster: (audit?.devCluster as boolean) ?? false,
        devClusterSeverity:
          (audit?.devClusterSeverity as SecurityScan['devClusterSeverity']) ??
          computeDevClusterSeverity((audit?.topHolderPercent as number) ?? 0),
        devWalletCount: (audit?.devWalletCount as number) ?? 0,
        honeypot: (audit?.honeypot as boolean) ?? false,
        buyTax: (audit?.buyTax as number) ?? 0,
        sellTax: (audit?.sellTax as number) ?? 0,
        contractVerified: (audit?.contractVerified as boolean) ?? false,
        canRenounce: (audit?.canRenounce as boolean) ?? false,
        ownerRenounced: (audit?.ownerRenounced as boolean) ?? false,
        totalHolders: (audit?.totalHolders as number) ?? 0,
        topHolderPercent: (audit?.topHolderPercent as number) ?? 0,
        riskScore: (audit?.riskScore as number) ?? 0,
        ton: (audit?.ton as SecurityScan['ton']) ?? undefined,
      } as SecurityScan;
    });

    return cachedJson(
      req,
      { data: scans, cached: false, timestamp: Date.now(), source: 'live' },
      { sMaxAge: 30, swr: 120 },
      'live',
    );
  } catch {
    return cachedJson(
      req,
      { data: [], cached: false, timestamp: Date.now(), source: 'empty' },
      { sMaxAge: 30, swr: 120, staleReason: 'db_error' },
      'fallback',
    );
  }
}
