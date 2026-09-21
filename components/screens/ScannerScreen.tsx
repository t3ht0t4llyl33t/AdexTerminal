'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldX,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Link2,
  Zap,
  FileSearch,
  Eye,
  Bug,
  Network,
  TrendingUp,
  X,
  History,
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import type { SecurityScan, Language, NetworkSelection } from '@/lib/types';
import { translate, interpolate, type TranslationKey } from '@/lib/i18n';
import { NetworkBadge } from '@/components/shared/NetworkBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { RiskAdvisory } from '@/components/shared/RiskAdvisory';
import { NetworkSwitcher } from '@/components/shared/NetworkSwitcher';
import { formatAddress } from '@/components/shared/Format';
import { cn } from '@/lib/utils';
import { buildTradeLink, DEFAULT_TRADE_SETTINGS, type TradeSettings } from '@/lib/trade-links';
import { trackEvent } from '@/lib/product-events';

interface ScannerScreenProps {
  scans: SecurityScan[];
  lang: Language;
  networks: NetworkSelection;
  onNetworksChange: (n: NetworkSelection) => void;
}

interface AuditResponse {
  scan: SecurityScan;
  verdictKey: TranslationKey;
  devClusterAlertKey: TranslationKey | null;
  insiderWeight: number;
  cached: boolean;
  remainingScans: number;
  totalAllowed?: number;
  locked?: boolean;
  message?: string;
}

const DAILY_FREE_LIMIT = 10;


export function ScannerScreen({ scans, lang, networks, onNetworksChange }: ScannerScreenProps) {
  const [searchInput, setSearchInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitModal, setLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<SecurityScan[]>([]);
  const [tradeSettings, setTradeSettings] = useState<TradeSettings>(DEFAULT_TRADE_SETTINGS);

  const refreshHistory = () => {
    authFetch('/api/scanner')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setScanHistory(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    authFetch('/api/trade-settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'get' }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.settings) {
          setTradeSettings(json.settings);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleScan = async () => {
    if (!searchInput.trim() || searchInput.trim().length < 10) return;
    setScanning(true);
    setError(null);
    setBonusMessage(null);
    trackEvent('scan_started', { addr_len: searchInput.trim().length });

    try {
      const res = await authFetch('/api/scanner', {
        method: 'POST',
        body: JSON.stringify({
          address: searchInput.trim(),
        }),
      });

      let json: Record<string, unknown> | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!json) {
        setError(translate(lang, 'common.error'));
        setScanning(false);
        return;
      }

      if (json.locked) {
        setLimitMessage((json.message as string) || translate(lang, 'scanner.dailyLimitExhausted'));
        setLimitModal(true);
        setScanning(false);
        return;
      }

      if (json.bonusGranted !== undefined) {
        setBonusMessage((json.message as string) || null);
      }

      if (json.scan) {
        setAudit(json as unknown as AuditResponse);
        trackEvent('scan_completed', {
          risk: (json.scan as { riskLevel?: string })?.riskLevel ?? 'unknown',
          network: (json.scan as { network?: string })?.network ?? 'unknown',
        });
        refreshHistory();
      } else if (json.error) {
        setError(String(json.error));
      } else if (!res.ok) {
        setError(translate(lang, 'common.error'));
      }
    } catch {
      setError(translate(lang, 'common.error'));
    }

    setScanning(false);
  };

  const handleBonusScans = async () => {
    try {
      const res = await authFetch('/api/scanner', {
        method: 'POST',
        body: JSON.stringify({
          address: searchInput.trim() || '0x0000000000000000000000000000000000000000',
          referralToken: 'bonus-link',
          referrerTgId: 'adex-system',
        }),
      });

      const json = await res.json();
      if (json.bonusGranted) {
        setBonusMessage(translate(lang, 'scanner.bonusGranted'));
        setLimitModal(false);
      } else {
        setBonusMessage(translate(lang, 'scanner.bonusAlreadyClaimed'));
      }
    } catch {
      setBonusMessage(translate(lang, 'common.error'));
    }
  };

  const filtered = scans.filter(
    (s) => networks.includes(s.network),
  );

  const displayScan = audit?.scan;
  const hasDevCluster = displayScan?.devCluster ?? false;
  const devSeverity: 'safe' | 'warning' | 'danger' =
    displayScan?.devClusterSeverity ?? 'safe';
  const devColors = devSeverity === 'danger'
    ? {
        text: 'text-red-300',
        textMuted: 'text-red-300/60',
        border: 'border-red-400/40',
        borderSoft: 'border-red-400/30',
        bg: 'bg-red-400/10',
        icon: 'text-red-400',
        lineFrom: 'from-red-400/60',
        lineTo: 'to-red-400/20',
        shadow: 'shadow-[0_0_22px_rgba(239,68,68,0.1)]',
        nodeShadow: 'shadow-[0_0_14px_rgba(239,68,68,0.25)]',
      }
    : {
        text: 'text-amber-300',
        textMuted: 'text-amber-300/60',
        border: 'border-amber-400/40',
        borderSoft: 'border-amber-400/30',
        bg: 'bg-amber-400/10',
        icon: 'text-amber-400',
        lineFrom: 'from-amber-400/60',
        lineTo: 'to-amber-400/20',
        shadow: 'shadow-[0_0_22px_rgba(251,191,36,0.1)]',
        nodeShadow: 'shadow-[0_0_14px_rgba(251,191,36,0.25)]',
      };
  const insiderWeight = audit?.insiderWeight ?? 0;

  const capabilities = [
    { icon: FileSearch, label: translate(lang, 'scanner.card1Title') },
    { icon: Bug, label: translate(lang, 'scanner.card2Title') },
    { icon: Eye, label: translate(lang, 'scanner.card3Title') },
    { icon: Network, label: translate(lang, 'scanner.card4Title') },
  ];

  const cardCls = 'border border-fuchsia-400/20 bg-[#0b0a1f]/80 rounded-2xl';
  const cardShadow = 'shadow-[0_0_18px_rgba(192,38,211,0.08)]';

  return (
    <div className="w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4 scrollbar-none pb-8">
      {/* Hero block with vault image */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-fuchsia-400/50 flex-shrink-0 shadow-[0_0_14px_rgba(192,38,211,0.25)]">
            <img src="/scanner-vault.webp" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-base sm:text-lg font-black tracking-[0.06em] text-white uppercase truncate">
              {translate(lang, 'scanner.title')}
            </h1>
            <p className="text-[10px] sm:text-xs text-fuchsia-200/60 mt-0.5 tracking-[0.08em] uppercase leading-tight line-clamp-2">
              {translate(lang, 'scanner.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <NetworkSwitcher lang={lang} networks={networks} onNetworksChange={onNetworksChange} />

      {/* Search bar + Scan button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder={translate(lang, 'scanner.searchPlaceholder')}
            className="w-full bg-[#0a0820] border-2 border-fuchsia-400/50 rounded-2xl pl-11 pr-12 py-3.5 text-xs sm:text-sm font-mono text-white placeholder-fuchsia-200/30 outline-none shadow-[0_0_16px_rgba(192,38,211,0.28),inset_0_0_10px_rgba(192,38,211,0.06)] focus:border-fuchsia-200/80 focus:shadow-[0_0_24px_rgba(217,70,239,0.42),inset_0_0_12px_rgba(192,38,211,0.08)] transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-300/60" />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-fuchsia-400/10 border border-fuchsia-400/30 text-fuchsia-200/60 hover:text-fuchsia-200 hover:bg-fuchsia-400/20 transition-all"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || searchInput.trim().length < 10}
          className="scan-button-glow px-6 py-3.5 rounded-2xl border border-fuchsia-100/80 text-white text-sm font-bold hover:brightness-125 hover:scale-[1.01] transition-all whitespace-nowrap disabled:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(217,70,239,0.72),0_0_64px_rgba(192,38,211,0.42),inset_0_0_16px_rgba(255,255,255,0.18)]"
        >
          {scanning ? (
            <>
              <div className="w-4 h-4 border-2 border-fuchsia-200/30 border-t-fuchsia-200 rounded-full animate-spin" />
              {translate(lang, 'scanner.scanning')}
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              {translate(lang, 'scanner.scanButton')}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-300 font-mono px-4 py-3 bg-red-400/5 border border-red-400/25 rounded-2xl">
          {error}
        </div>
      )}

      {bonusMessage && (
        <div className="text-xs text-emerald-300 font-mono px-4 py-3 bg-emerald-400/5 border border-emerald-400/25 rounded-2xl animate-fade-in">
          {bonusMessage}
        </div>
      )}

      {/* Capabilities grid (shown when no scan yet) */}
      {!displayScan && !scanning && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {capabilities.map((cap) => (
              <div
                key={cap.label}
                className="card-neon-uniform min-h-[128px] p-3 text-center border-2 border-fuchsia-400/45 bg-[radial-gradient(circle_at_50%_0%,rgba(192,38,211,0.16),transparent_62%),#0b0a1f] rounded-2xl flex flex-col items-center justify-center shadow-[inset_0_0_18px_rgba(192,38,211,0.06)]"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-fuchsia-400/10 border border-fuchsia-300/60 flex items-center justify-center mx-auto mb-2 shadow-[0_0_16px_rgba(217,70,239,0.3)]">
                  <cap.icon className="w-4 h-4 text-fuchsia-100" />
                </div>
                <div className="min-h-[32px] max-w-full overflow-hidden text-[8px] sm:text-[9px] font-mono font-semibold text-fuchsia-50/80 uppercase leading-[1.25] tracking-[0.04em] line-clamp-2 break-words flex items-center justify-center">
                  {cap.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Audit results */}
      {displayScan && (
        <div className="space-y-4 animate-fade-in">
          {/* Token header */}
          <div className={cn('p-4', cardCls, cardShadow)}>
            <div className="flex items-center gap-3 mb-3">
              <NetworkBadge network={displayScan.network} />
              <span className="text-base font-bold text-white">
                ${displayScan.tokenSymbol}
              </span>
              <span className="text-[10px] font-mono text-white/30 flex items-center gap-1">
                {formatAddress(displayScan.address)}
                <CopyButton text={displayScan.address} />
              </span>
              <span className="ml-auto text-[9px] font-mono text-white/20">
                {audit?.cached ? 'CACHED' : 'FRESH'}
              </span>
            </div>

            {/* Overall security verdict bar */}
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl border',
                displayScan.riskScore <= 30
                  ? 'bg-emerald-400/10 border-emerald-400/40'
                  : displayScan.riskScore <= 60
                    ? 'bg-amber-400/10 border-amber-400/40'
                    : 'bg-red-400/10 border-red-400/40',
              )}
            >
              {displayScan.riskScore <= 30 ? (
                <ShieldCheck className="w-5 h-5 text-emerald-300 flex-shrink-0" />
              ) : (
                <ShieldX className="w-5 h-5 text-red-300 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm font-bold',
                  displayScan.riskScore <= 30
                    ? 'text-emerald-300'
                    : displayScan.riskScore <= 60
                      ? 'text-amber-300'
                      : 'text-red-300',
                )}
              >
                {translate(lang, 'scanner.riskScore')}: {displayScan.riskScore}/100
              </span>
              <div className="ml-auto flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-5 rounded-sm',
                      i < Math.round(displayScan.riskScore / 20)
                        ? displayScan.riskScore <= 30
                          ? 'bg-emerald-400'
                          : displayScan.riskScore <= 60
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        : 'bg-white/10',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Security checks grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayScan.network === 'TON' && displayScan.ton ? (
              <>
                {/* Card 1 (TON): Mint status */}
                <div className={cn('p-4', cardCls, cardShadow)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border flex items-center justify-center',
                        displayScan.ton.mintStatus === 'mintable'
                          ? 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                          : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                      )}
                    >
                      <Zap
                        className={cn(
                          'w-4 h-4',
                          displayScan.ton.mintStatus === 'mintable' ? 'text-red-400' : 'text-emerald-300',
                        )}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {translate(lang, 'scanner.tonMintTitle')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-mono font-bold',
                      displayScan.ton.mintStatus === 'mintable' ? 'text-red-400' : 'text-emerald-300',
                    )}
                  >
                    {displayScan.ton.mintStatus === 'mintable'
                      ? translate(lang, 'scanner.tonMintMintable')
                      : translate(lang, 'scanner.tonMintNotMintable')}
                  </div>
                </div>

                {/* Card 2 (TON): Owner status */}
                <div className={cn('p-4', cardCls, cardShadow)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border flex items-center justify-center',
                        displayScan.ton.ownerStatus === 'active_admin'
                          ? 'bg-amber-400/10 border-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                          : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                      )}
                    >
                      {displayScan.ton.ownerStatus === 'active_admin' ? (
                        <Unlock className="w-4 h-4 text-amber-300" />
                      ) : (
                        <Lock className="w-4 h-4 text-emerald-300" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {translate(lang, 'scanner.tonOwnerTitle')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-mono font-bold',
                      displayScan.ton.ownerStatus === 'active_admin' ? 'text-amber-300' : 'text-emerald-300',
                    )}
                  >
                    {displayScan.ton.ownerStatus === 'active_admin'
                      ? translate(lang, 'scanner.tonOwnerActive')
                      : displayScan.ton.ownerStatus === 'renounced'
                        ? translate(lang, 'scanner.tonOwnerRenounced')
                        : translate(lang, 'scanner.tonOwnerUnknown')}
                  </div>
                </div>

                {/* Card 3 (TON): LP distribution */}
                <div className={cn('p-4', cardCls, cardShadow)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border flex items-center justify-center',
                        displayScan.ton.lpDexList.length === 0
                          ? 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                          : displayScan.ton.lpTotalUsd < 5000
                            ? 'bg-amber-400/10 border-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                            : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                      )}
                    >
                      <Network
                        className={cn(
                          'w-4 h-4',
                          displayScan.ton.lpDexList.length === 0
                            ? 'text-red-400'
                            : displayScan.ton.lpTotalUsd < 5000
                              ? 'text-amber-300'
                              : 'text-emerald-300',
                        )}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {translate(lang, 'scanner.tonLpTitle')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-mono font-bold',
                      displayScan.ton.lpDexList.length === 0
                        ? 'text-red-400'
                        : displayScan.ton.lpTotalUsd < 5000
                          ? 'text-amber-300'
                          : 'text-emerald-300',
                    )}
                  >
                    {displayScan.ton.lpDexList.length === 0
                      ? translate(lang, 'scanner.tonLpNoPools')
                      : displayScan.ton.lpTotalUsd < 5000
                        ? translate(lang, 'scanner.tonLpLow')
                        : interpolate(translate(lang, 'scanner.tonLpHealthy'), {
                            dexes: displayScan.ton.lpDexList.map((d) => d.toUpperCase()).join(' + '),
                          })}
                  </div>
                  {displayScan.ton.lpDexList.length > 0 && (
                    <div className="text-[10px] font-mono text-white/30 mt-1.5">
                      {translate(lang, 'scanner.tonLiquidityLabel')}: ${displayScan.ton.lpTotalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>

                {/* Card 4 (TON): Insider concentration (system contracts filtered out) */}
                <div className={cn('p-4', cardCls, cardShadow)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border flex items-center justify-center',
                        hasDevCluster
                          ? 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                          : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          'w-4 h-4',
                          hasDevCluster ? 'text-red-400' : 'text-emerald-300',
                        )}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {translate(lang, 'scanner.card4Title')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-sm font-mono font-bold',
                      hasDevCluster ? 'text-red-400' : 'text-emerald-300',
                    )}
                  >
                    {displayScan.ton.nonSystemTopHolderPct.toFixed(1)}%{' '}
                    <span className="text-white/40 font-normal">
                      ({hasDevCluster ? translate(lang, 'scanner.highRisk') : translate(lang, 'scanner.lowRisk')})
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-white/30 mt-1.5">
                    {displayScan.ton.verifiedByTonapi
                      ? translate(lang, 'scanner.tonVerifiedYes')
                      : translate(lang, 'scanner.tonVerifiedNo')}
                  </div>
                </div>
              </>
            ) : (
              <>
            {/* Card 1: Liquidity Lock */}
            <div className={cn('p-4', cardCls, cardShadow)}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl border flex items-center justify-center',
                    displayScan.lpLocked
                      ? 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                      : 'bg-amber-400/10 border-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
                  )}
                >
                  {displayScan.lpLocked ? (
                    <Lock className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Unlock className="w-4 h-4 text-amber-300" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {translate(lang, 'scanner.card1Title')}
                </span>
              </div>
              <div
                className={cn(
                  'text-sm font-mono font-bold',
                  displayScan.network === 'TON' || displayScan.lpLocked ? 'text-emerald-300' : 'text-amber-300',
                )}
              >
                {displayScan.network === 'TON'
                  ? translate(lang, 'scanner.tonArchitecture')
                  : displayScan.lpLocked
                    ? translate(lang, 'scanner.lpBurned')
                    : translate(lang, 'scanner.lpUnlockedRisk')}
              </div>
              {displayScan.network !== 'TON' && displayScan.lpLocked && displayScan.lpLockedUntil && (
                <div className="text-[10px] font-mono text-white/30 mt-1.5">
                  {displayScan.lpLockPercent}% • {displayScan.lpLockedUntil}
                </div>
              )}
            </div>

            {/* Card 2: Honeypot Test */}
            <div className={cn('p-4', cardCls, cardShadow)}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl border flex items-center justify-center',
                    displayScan.honeypot
                      ? 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                  )}
                >
                  {displayScan.honeypot ? (
                    <ShieldX className="w-4 h-4 text-red-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {translate(lang, 'scanner.card2Title')}
                </span>
              </div>
              <div
                className={cn(
                  'text-sm font-mono font-bold',
                  displayScan.honeypot ? 'text-red-400' : 'text-emerald-300',
                )}
              >
                {displayScan.honeypot
                  ? translate(lang, 'scanner.honeypotDetected')
                  : translate(lang, 'scanner.honeypotPassed')}
              </div>
            </div>

            {/* Card 3: Contract Verification & Holder Count */}
            <div className={cn('p-4', cardCls, cardShadow)}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl border flex items-center justify-center',
                    displayScan.contractVerified
                      ? 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                      : 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
                  )}
                >
                  {displayScan.contractVerified ? (
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {translate(lang, 'scanner.card3Title')}
                </span>
              </div>
              <div
                className={cn(
                  'text-sm font-mono font-bold',
                  displayScan.contractVerified ? 'text-emerald-300' : 'text-red-400',
                )}
              >
                {displayScan.contractVerified
                  ? translate(lang, 'scanner.verified')
                  : translate(lang, 'scanner.unverified')}
              </div>
              <div className="text-[10px] font-mono text-white/30 mt-1.5">
                {translate(lang, 'scanner.holders')}: {displayScan.totalHolders.toLocaleString()}
              </div>
            </div>

            {/* Card 4: Insider Cluster Weight */}
            <div className={cn('p-4', cardCls, cardShadow)}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl border flex items-center justify-center',
                    hasDevCluster
                      ? 'bg-red-400/10 border-red-300/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : 'bg-emerald-400/10 border-emerald-300/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'w-4 h-4',
                      hasDevCluster ? 'text-red-400' : 'text-emerald-300',
                    )}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {translate(lang, 'scanner.card4Title')}
                </span>
              </div>
              <div
                className={cn(
                  'text-sm font-mono font-bold',
                  hasDevCluster ? 'text-red-400' : 'text-emerald-300',
                )}
              >
                {displayScan.topHolderPercent.toFixed(1)}%{' '}
                <span className="text-white/40 font-normal">
                  ({hasDevCluster ? translate(lang, 'scanner.highRisk') : translate(lang, 'scanner.lowRisk')})
                </span>
              </div>
            </div>

            </>
            )}
          </div>

          {/* Metric strip: TON shows liquidity/pools/risk; EVM shows tax/tax/risk */}
          <div className="grid grid-cols-3 gap-3">
            {displayScan.network === 'TON' && displayScan.ton ? (
              <>
                <div className={cn('p-3 text-center', cardCls)}>
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                    {translate(lang, 'scanner.tonPoolsFound')}
                  </div>
                  <div
                    className={cn(
                      'text-base font-mono font-bold',
                      displayScan.ton.lpDexList.length === 0 ? 'text-red-400' : 'text-emerald-300',
                    )}
                  >
                    {displayScan.ton.lpDexList.length}
                  </div>
                </div>
                <div className={cn('p-3 text-center', cardCls)}>
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                    {translate(lang, 'scanner.tonAgeLabel')}
                  </div>
                  <div className="text-base font-mono font-bold text-white/80">
                    {displayScan.ton.jettonAgeDays !== null
                      ? interpolate(translate(lang, 'scanner.tonAgeDays'), { days: displayScan.ton.jettonAgeDays })
                      : translate(lang, 'scanner.tonAgeUnknown')}
                  </div>
                </div>
                <div className={cn('p-3 text-center', cardCls)}>
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                    {translate(lang, 'scanner.riskScore')}
                  </div>
                  <div
                    className={cn(
                      'text-base font-mono font-bold',
                      displayScan.riskScore > 60
                        ? 'text-red-400'
                        : displayScan.riskScore > 30
                          ? 'text-amber-300'
                          : 'text-emerald-300',
                    )}
                  >
                    {displayScan.riskScore}
                  </div>
                </div>
              </>
            ) : (
              <>
            <div className={cn('p-3 text-center', cardCls)}>
              <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                {translate(lang, 'scanner.buyTax')}
              </div>
              <div
                className={cn(
                  'text-base font-mono font-bold',
                  displayScan.buyTax > 5 ? 'text-amber-300' : 'text-emerald-300',
                )}
              >
                {displayScan.buyTax}%
              </div>
            </div>
            <div className={cn('p-3 text-center', cardCls)}>
              <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                {translate(lang, 'scanner.sellTax')}
              </div>
              <div
                className={cn(
                  'text-base font-mono font-bold',
                  displayScan.sellTax > 5 ? 'text-red-400' : 'text-emerald-300',
                )}
              >
                {displayScan.sellTax}%
              </div>
            </div>
            <div className={cn('p-3 text-center', cardCls)}>
              <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">
                {translate(lang, 'scanner.riskScore')}
              </div>
              <div
                className={cn(
                  'text-base font-mono font-bold',
                  displayScan.riskScore > 60
                    ? 'text-red-400'
                    : displayScan.riskScore > 30
                      ? 'text-amber-300'
                      : 'text-emerald-300',
                )}
              >
                {displayScan.riskScore}
              </div>
            </div>
            </>
            )}
          </div>

          {/* Apex AI Verdict Terminal */}
          <div className={cn('p-4 border border-fuchsia-400/25 bg-[#0b0a1f]/80 rounded-2xl shadow-[0_0_22px_rgba(192,38,211,0.12)]')}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0.2)]">
                <Cpu className="w-4 h-4 text-fuchsia-200" />
              </div>
              <span className="text-xs font-mono text-fuchsia-200 uppercase tracking-wider font-bold">
                {translate(lang, 'scanner.apexAiLabel')}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl p-3 border border-fuchsia-400/20 font-mono text-xs text-fuchsia-200/80 leading-relaxed">
              <span className="text-fuchsia-300">{'> '}</span>
              {audit?.verdictKey
                ? translate(lang, audit.verdictKey)
                : translate(lang, 'scanner.verdictCaution')}
            </div>
            {/* Trade button — shown for non-danger verdicts */}
            {!displayScan.honeypot && displayScan.riskScore < 60 && (
              <a
                href={buildTradeLink(displayScan.network, displayScan.address, tradeSettings)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-300/50 text-emerald-100 text-sm font-bold hover:from-emerald-500/30 hover:to-teal-500/30 hover:border-emerald-300/70 transition-all shadow-[0_0_18px_rgba(52,211,153,0.2)]"
              >
                <TrendingUp className="w-4 h-4" />
                {lang === 'RU' ? 'Торговать' : 'Trade'} {displayScan.tokenSymbol !== 'UNKNOWN' ? `${displayScan.tokenSymbol}` : ''}
              </a>
            )}
          </div>

          {/* Dev Cluster Visualizer */}
          {hasDevCluster && (
            <div className={cn('p-4', cardCls, devColors.shadow)}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', devColors.bg, devColors.borderSoft, 'border')}>
                  <Link2 className={cn('w-4 h-4', devColors.icon)} />
                </div>
                <span className={cn('text-xs font-mono uppercase tracking-wider font-bold', devColors.text)}>
                  {translate(lang, 'scanner.devClusterTitle')}
                </span>
                <span className={cn('ml-auto text-[10px] font-mono', devColors.textMuted)}>
                  {displayScan.devWalletCount} {lang === 'RU' ? 'кошельков' : 'wallets'}
                </span>
              </div>

              {/* Tree diagram */}
              <div className="flex flex-col items-center gap-2 py-3">
                {/* Central deployer node */}
                <div className="flex flex-col items-center">
                  <div className={cn('px-4 py-2 rounded-xl border text-xs font-mono font-bold', devColors.bg, devColors.border, devColors.text, devColors.nodeShadow)}>
                    {translate(lang, 'scanner.deployerWallet')}
                  </div>
                  <div className="text-[10px] font-mono text-white/30 mt-1.5 flex items-center gap-1">
                    {formatAddress(displayScan.address)}
                    <CopyButton text={displayScan.address} />
                  </div>
                </div>

                {/* Connecting lines — dynamic count */}
                <div className="flex items-end justify-center gap-4 sm:gap-8 h-8" style={{ gap: `${Math.max(4, 40 / Math.max(displayScan.devWalletCount, 1))}px` }}>
                  {Array.from({ length: Math.min(displayScan.devWalletCount, 8) }).map((_, i) => (
                    <div key={i} className={cn('w-px h-7 bg-gradient-to-b', devColors.lineFrom, devColors.lineTo)} />
                  ))}
                </div>

                {/* Insider wallet nodes — dynamic count */}
                <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-5 w-full max-w-md">
                  {Array.from({ length: Math.min(displayScan.devWalletCount, 8) }).map((_, i) => {
                    const letters = 'ABCDEFGH';
                    const letter = letters[i] ?? '?';
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="px-2.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold text-center shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                          {lang === 'RU' ? 'Кошелёк' : 'Wallet'} {letter}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dev cluster alert box */}
              <div className={cn('mt-4 p-4 rounded-xl border', devColors.bg, devColors.border, devSeverity === 'danger' ? 'animate-pulse-glow' : '')}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', devColors.icon)} />
                  <p className={cn('text-xs font-mono leading-relaxed font-bold', devColors.text)}>
                    {audit?.devClusterAlertKey
                      ? interpolate(translate(lang, audit.devClusterAlertKey), {
                          count: displayScan.devWalletCount,
                          percent: displayScan.topHolderPercent.toFixed(1),
                        })
                      : interpolate(translate(lang, 'scanner.devClusterAlert'), {
                          count: displayScan.devWalletCount,
                          percent: displayScan.topHolderPercent.toFixed(1),
                        })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {audit && (
            <div className="text-[10px] font-mono text-white/30 text-right break-all">
              {translate(lang, 'scanner.dailyLimitLabel')}: {audit.remainingScans}/{audit.totalAllowed ?? DAILY_FREE_LIMIT} remaining
            </div>
          )}
        </div>
      )}

      {/* Scan history — user's last 5 scans */}
      {scanHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-fuchsia-200/50 uppercase tracking-wider">
            <History className="w-3 h-3" />
            {lang === 'RU' ? 'История сканирований' : 'Scan History'}
          </div>
          {scanHistory.filter((s) => networks.includes(s.network)).map((scan) => (
            <div
              key={scan.id}
              className="border border-fuchsia-400/20 bg-[#0b0a1f]/80 rounded-2xl p-3 hover:border-fuchsia-400/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NetworkBadge network={scan.network} />
                  <span className="text-xs font-mono font-bold text-white">
                    ${scan.tokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {scan.network !== 'TON' && (
                    scan.lpLocked ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-red-400" />
                    )
                  )}
                  {scan.contractVerified ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded', scan.riskScore <= 30 ? 'bg-emerald-400/10 text-emerald-300' : scan.riskScore <= 60 ? 'bg-amber-400/10 text-amber-300' : 'bg-red-400/10 text-red-300')}>
                    {scan.riskScore}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-white/30">
                {formatAddress(scan.address)}
                <CopyButton text={scan.address} />
              </div>
            </div>
          ))}
        </div>
      )}

      <RiskAdvisory lang={lang} />

      {/* Daily Limit Modal */}
      {limitModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLimitModal(false)}
        >
          <div className="absolute inset-0 bg-[#030510]/80 backdrop-blur-md" />
          <div
            className="relative bg-[#0a0820] border border-fuchsia-400/40 rounded-2xl max-w-sm w-full p-6 shadow-[0_0_30px_rgba(192,38,211,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-400/10 border border-fuchsia-400/40 flex items-center justify-center shadow-[0_0_16px_rgba(192,38,211,0.25)]">
                <ShieldAlert className="w-7 h-7 text-fuchsia-200" />
              </div>
              <h2 className="text-sm font-bold text-fuchsia-200 font-mono">
                {limitMessage}
              </h2>
              <button
                onClick={handleBonusScans}
                className="w-full mt-1 py-3 rounded-xl bg-emerald-400/10 border border-emerald-300/40 text-emerald-300 font-bold text-xs font-mono hover:bg-emerald-400/20 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(52,211,153,0.15)]"
              >
                <Zap className="w-4 h-4" />
                {translate(lang, 'scanner.getBonusScans')}
              </button>
              <button
                onClick={() => setLimitModal(false)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors mt-1"
              >
                {translate(lang, 'common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
