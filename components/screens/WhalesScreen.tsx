'use client';

import { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Copy,
  Zap,
  Settings2,
  Lock,
  Search,
  Infinity as InfinityIcon,
  ChevronDown,
} from 'lucide-react';
import type { WhaleAlert, Language, NetworkSelection, ProSettings } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { NetworkBadge } from '@/components/shared/NetworkBadge';
import { CopyButton } from '@/components/shared/CopyButton';
import { RiskAdvisory } from '@/components/shared/RiskAdvisory';
import { NetworkSwitcher } from '@/components/shared/NetworkSwitcher';
import { WhalePositionModal } from '@/components/shared/WhalePositionModal';
import { formatTimeAgo, formatAddress } from '@/components/shared/Format';
import { cn } from '@/lib/utils';
import { buildTradeLink, openTradeLink, isValidTokenAddress, type TradeSettings, DEFAULT_TRADE_SETTINGS } from '@/lib/trade-links';
import { useInvalidAddressToast } from '@/components/shared/InvalidAddressToast';

interface WhalesScreenProps {
  whales: WhaleAlert[];
  lang: Language;
  networks: NetworkSelection;
  onNetworksChange: (n: NetworkSelection) => void;
  isPro: boolean;
  onUpgrade: () => void;
  tradeSettings?: TradeSettings;
  proSettings?: ProSettings;
  onProSettingsChange?: (settings: Partial<ProSettings>) => void;
}

function buildMirrorLink(whale: WhaleAlert, settings: TradeSettings = DEFAULT_TRADE_SETTINGS): string | null {
  return buildTradeLink(whale.network, whale.tokenAddress, settings);
}

function formatTxDescription(whale: WhaleAlert, lang: Language): string {
  const action =
    whale.type === 'buy'
      ? translate(lang, 'whales.buy')
      : translate(lang, 'whales.sell');
  const tokenAmount = whale.amountTokens.toLocaleString('en', {
    maximumFractionDigits: 0,
  });
  const nativeAmount = whale.nativeAmount.toLocaleString('en', {
    maximumFractionDigits: 2,
  });
  return `${action} ${tokenAmount} $${whale.tokenSymbol} ${translate(lang, 'whales.buy') === 'BUY' ? 'for' : 'за'} ${nativeAmount} ${whale.nativeCurrency} ($${whale.amountUsd.toLocaleString('en')})`;
}

function formatTimestamp(ts: number, lang: Language): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return translate(lang, 'whales.justNow');
  return `${formatTimeAgo(ts)} ${translate(lang, 'whales.ago')}`;
}

const networkImages: Record<WhaleAlert['network'], string[]> = {
  TON: ['/whale-ton-1.webp', '/whale-ton-2.webp'],
  BSC: ['/whale-bsc-1.webp', '/whale-bsc-2.webp'],
  BASE: ['/whale-base-1.webp', '/whale-base-2.webp'],
};

function imageForNetwork(network: WhaleAlert['network'], index: number): string {
  const images = networkImages[network];
  return images[index % images.length];
}

function networkOrbClass(network: WhaleAlert['network']): string {
  if (network === 'TON') return 'border-[#0098EA]/70 shadow-[0_0_14px_rgba(0,152,234,0.75)]';
  if (network === 'BSC') return 'border-[#F0B90B]/70 shadow-[0_0_14px_rgba(240,185,11,0.65)]';
  return 'border-[#627EEA]/70 shadow-[0_0_14px_rgba(98,126,234,0.65)]';
}

export function WhalesScreen({ whales, lang, networks, onNetworksChange, isPro, onUpgrade, tradeSettings = DEFAULT_TRADE_SETTINGS, proSettings, onProSettingsChange }: WhalesScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshotWhale, setSnapshotWhale] = useState<WhaleAlert | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const invalidToast = useInvalidAddressToast(lang);
  const minimumVolume = proSettings?.whale_min_volume ?? 3000;
  const buysOnly = proSettings?.whale_buys_only ?? false;
  const filtered = whales
    .filter((w) => networks.includes(w.network) && w.amountUsd >= minimumVolume && (!buysOnly || w.type === 'buy'))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10 * networks.length);

  const nativeInflow = useMemo(() => {
    const totals: Record<'TON' | 'BSC' | 'BASE', number> = { TON: 0, BSC: 0, BASE: 0 };
    for (const w of filtered) {
      if (w.type === 'buy') totals[w.network] += w.nativeAmount;
    }
    return totals;
  }, [filtered]);

  const formatNative = (network: 'TON' | 'BSC' | 'BASE') => {
    const symbol = network === 'TON' ? 'TON' : network === 'BSC' ? 'BNB' : 'ETH';
    const value = nativeInflow[network];
    if (value === 0) return `+0 ${symbol}`;
    return `+${value.toLocaleString('en', { maximumFractionDigits: 0 })} ${symbol}`;
  };

  const metrics = [
    {
      label: translate(lang, 'whales.smartMoney'),
      value: String(filtered.length),
      icon: Activity,
      color: 'text-fuchsia-200',
      border: 'border-fuchsia-400/30',
      shadow: 'shadow-[0_0_16px_rgba(192,38,211,0.16)]',
    },
    {
      label: translate(lang, 'whales.tonInflows'),
      value: formatNative('TON'),
      icon: TrendingUp,
      color: 'text-fuchsia-200',
      border: 'border-fuchsia-400/30',
      shadow: 'shadow-[0_0_16px_rgba(192,38,211,0.16)]',
    },
    {
      label: translate(lang, 'whales.bscInflows'),
      value: formatNative('BSC'),
      icon: TrendingUp,
      color: 'text-fuchsia-200',
      border: 'border-fuchsia-400/30',
      shadow: 'shadow-[0_0_16px_rgba(192,38,211,0.16)]',
    },
    {
      label: translate(lang, 'whales.baseInflows'),
      value: formatNative('BASE'),
      icon: TrendingUp,
      color: 'text-fuchsia-200',
      border: 'border-fuchsia-400/30',
      shadow: 'shadow-[0_0_16px_rgba(192,38,211,0.16)]',
    },
  ];

  const handleSnapshotClick = (whale: WhaleAlert) => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    setSnapshotWhale(whale);
    setSnapshotOpen(true);
  };

  return (
    <div className="w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4 scrollbar-none pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-fuchsia-400/50 flex-shrink-0 shadow-[0_0_14px_rgba(192,38,211,0.25)]">
            <img src="/whale-violet.webp" alt="" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-base sm:text-lg font-black tracking-[0.06em] text-white uppercase truncate">
              {translate(lang, 'whales.title')}
            </h1>
            <p className="text-[10px] sm:text-xs text-fuchsia-200/60 mt-0.5 tracking-[0.08em] uppercase truncate whitespace-nowrap">
              {translate(lang, 'whales.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <NetworkSwitcher lang={lang} networks={networks} onNetworksChange={onNetworksChange} />

      <div className="space-y-2">
        <button
          onClick={() => setSettingsOpen((open) => !open)}
          className={cn(
            'relative overflow-hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border bg-[#071126]/80 transition-all shadow-[0_0_14px_rgba(192,38,211,0.15)]',
            settingsOpen
              ? 'border-fuchsia-200 text-fuchsia-100 bg-fuchsia-400/15'
              : 'border-fuchsia-400/30 text-fuchsia-200 hover:border-fuchsia-300 hover:bg-fuchsia-400/10',
          )}
          aria-label={translate(lang, 'radar.filters')}
        >
          <Settings2 className="w-4 h-4" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">
            {translate(lang, 'radar.filters')}
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', settingsOpen && 'rotate-180')} />
        </button>

        {settingsOpen && (
          <div className="relative border border-fuchsia-400/30 rounded-2xl bg-[#071126]/90 p-4 shadow-[0_0_24px_rgba(192,38,211,0.12)] animate-fade-in">
            <div className={cn(!isPro && 'pointer-events-none blur-[0.5px]')}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-mono font-bold text-fuchsia-200 uppercase">
                    {translate(lang, 'radar.filters')}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-1">
                    {translate(lang, 'whales.minVolume')}
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-300 flex items-center gap-0.5">
                  {minimumVolume >= 1000000 && <InfinityIcon className="w-4 h-4" />}
                  {minimumVolume >= 1000000 ? '' : `${minimumVolume.toLocaleString('en-US')}`}
                </span>
              </div>
              <input
                type="range"
                min={3000}
                max={1000000}
                step={1000}
                value={Math.min(minimumVolume, 1000000)}
                onChange={(event) => onProSettingsChange?.({ whale_min_volume: Number(event.target.value) })}
                className="w-full accent-fuchsia-400"
                aria-label={translate(lang, 'whales.minVolume')}
              />
              <div className="flex justify-between text-[9px] font-mono text-white/25 mt-1">
                <span>$3K</span>
                <span className="flex items-center gap-0.5"><InfinityIcon className="w-2.5 h-2.5" /> $1M+</span>
              </div>

              <div className="flex items-center justify-between py-3 mt-2 border-t border-fuchsia-400/15">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-white/70">
                    {translate(lang, 'whales.buysOnly')}
                  </div>
                  <div className="text-[9px] text-white/30 mt-0.5">
                    {lang === 'RU' ? 'Скрыть все продажи из ленты' : 'Hide all sell transactions'}
                  </div>
                </div>
                <button
                  onClick={() => onProSettingsChange?.({ whale_buys_only: !buysOnly })}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                    buysOnly ? 'bg-emerald-400/30 border border-emerald-300/30' : 'bg-white/5 border border-white/10',
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                      buysOnly ? 'left-6 bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'left-1 bg-white/40',
                    )}
                  />
                </button>
              </div>
            </div>
            {!isPro && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer bg-[#0a0820]/40 backdrop-blur-[1px] rounded-2xl z-10"
                onClick={onUpgrade}
              >
                <div className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0a0820] border border-fuchsia-300/40 cursor-pointer hover:border-fuchsia-300/60 transition-colors shadow-[0_0_18px_rgba(192,38,211,0.25)]">
                  <Lock className="w-5 h-5 text-fuchsia-200" />
                  <span className="text-sm font-mono font-bold text-fuchsia-100 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              'border rounded-xl p-3 bg-[#071126]/80',
              m.border,
              m.shadow,
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <m.icon className={cn('w-3.5 h-3.5', m.color)} />
              <span className="text-[9px] font-mono text-white/40 uppercase truncate">
                {m.label}
              </span>
            </div>
            <div className={cn('text-sm font-mono font-bold', m.color)}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-thin space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-fuchsia-400/30 bg-fuchsia-400/5 flex items-center justify-center mb-4">
              <Activity className="w-7 h-7 text-fuchsia-200/50" />
            </div>
            <p className="text-sm font-mono text-white/40">
              {lang === 'RU' ? 'Китовых движений не зафиксировано' : 'No whale movements detected'}
            </p>
            <p className="text-[10px] font-mono text-white/20 mt-1">
              {lang === 'RU' ? 'Обновляется автоматически каждые 60 секунд' : 'Updates automatically every 60 seconds'}
            </p>
          </div>
        ) : (
          filtered.map((whale, idx) => {
            const isBuy = whale.type === 'buy';
            const Icon = isBuy ? TrendingUp : TrendingDown;
            const mirrorLink = buildMirrorLink(whale, tradeSettings);

            return (
              <div
                key={whale.id}
                className={cn(
                  'relative overflow-hidden border rounded-2xl p-3 sm:p-5 bg-gradient-to-br from-[#0b1428]/95 via-[#050a19]/95 to-[#071126]/90 transition-all duration-300 animate-fade-in',
                  isBuy
                    ? 'border-emerald-400/25 hover:border-emerald-300/60 hover:shadow-[0_0_28px_rgba(52,211,153,0.14)]'
                    : 'border-red-400/25 hover:border-red-300/60 hover:shadow-[0_0_28px_rgba(239,68,68,0.14)]',
                )}
              >
                <div className="absolute -right-20 -top-24 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-fuchsia-400/5 blur-3xl pointer-events-none" />
                <div className="relative flex items-center gap-3 sm:gap-5">
                  <div className="relative flex-shrink-0">
                    <div className={cn('w-14 h-14 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 bg-[#020714]', networkOrbClass(whale.network))}>
                      <img src={imageForNetwork(whale.network, idx)} alt="" className="w-full h-full object-cover scale-110" />
                    </div>
                    <div className={cn('absolute -bottom-1 -right-1 w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-[#071126] border-2 flex items-center justify-center', networkOrbClass(whale.network))}>
                      <span className="text-[8px] sm:text-[9px] font-black text-white">{whale.network}</span>
                    </div>
                  </div>

                  <div className="flex-grow min-w-0 self-stretch flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1 flex-wrap">
                      <span className="text-xs sm:text-base font-bold text-white truncate">
                        {whale.walletLabel} {formatAddress(whale.walletAddress)}
                      </span>
                      <button
                        onClick={() => handleSnapshotClick(whale)}
                        className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded transition-all',
                          'text-fuchsia-200/70 hover:text-fuchsia-100 hover:bg-fuchsia-400/10 hover:shadow-[0_0_10px_rgba(192,38,211,0.35)]',
                        )}
                        title={translate(lang, 'whales.snapshotBtn')}
                      >
                        <Search className="w-3 h-3" />
                      </button>
                      {whale.crossChainWallet && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-mono font-bold bg-fuchsia-400/10 text-fuchsia-200 border border-fuchsia-400/30">
                          <Zap className="w-2.5 h-2.5" />
                          {translate(lang, 'whales.crossChain')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mb-1 sm:mb-2">
                      <span className="text-[9px] sm:text-xs font-mono text-white/40">
                        {formatAddress(whale.tokenAddress)}
                      </span>
                      <CopyButton text={whale.tokenAddress} />
                    </div>

                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={cn('text-[10px] sm:text-sm font-mono font-bold uppercase tracking-wide', isBuy ? 'text-emerald-300' : 'text-red-300')}>
                        {isBuy ? translate(lang, 'whales.buy') : translate(lang, 'whales.sell')}
                      </span>
                      <span className="text-xs sm:text-lg font-mono text-white">
                        {whale.amountTokens.toLocaleString('en', { maximumFractionDigits: 0 })} {whale.nativeCurrency}
                      </span>
                    </div>
                    <div className="text-base sm:text-xl font-mono font-bold text-emerald-300 mt-0.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]">
                      +${whale.amountUsd.toLocaleString('en')}
                    </div>
                    <div className="text-[9px] sm:text-xs font-mono text-white/35 mt-0.5 sm:mt-1 truncate">
                      ~ {formatTxDescription(whale, lang)}
                    </div>

                    {whale.insiderDistribution && (
                      <div className="mt-1 sm:mt-2 inline-flex w-fit items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/40 animate-pulse-glow">
                        {translate(lang, 'whales.insiderWarning')}
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:flex flex-shrink-0 flex-col items-end justify-between self-stretch gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono text-white/40 whitespace-nowrap">
                        {formatTimestamp(whale.timestamp, lang)}
                      </span>
                    </div>
                    <button
                      onClick={() => { if (!mirrorLink) { invalidToast.notify(); return; } openTradeLink(mirrorLink); }}
                      className="inline-flex items-center justify-center gap-2 min-w-[170px] px-5 py-3 rounded-xl bg-emerald-400 text-[#02130b] text-sm font-bold transition-all whitespace-nowrap hover:bg-emerald-300 hover:scale-[1.02] shadow-[0_0_22px_rgba(52,211,153,0.45)]"
                    >
                      <Copy className="w-4 h-4" />
                      {translate(lang, 'whales.mirrorTrade')}
                    </button>
                  </div>
                </div>

                <div className="flex sm:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono text-white/40">
                      {formatTimestamp(whale.timestamp, lang)}
                    </span>
                  </div>
                  <button
                    onClick={() => { if (!mirrorLink) { invalidToast.notify(); return; } openTradeLink(mirrorLink); }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-400 text-[#02130b] text-[11px] font-bold hover:bg-emerald-300 transition-all shadow-[0_0_14px_rgba(52,211,153,0.4)]"
                  >
                    <Copy className="w-3 h-3" />
                    {translate(lang, 'whales.mirrorTrade')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RiskAdvisory lang={lang} />

      <WhalePositionModal
        whale={snapshotWhale}
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        lang={lang}
        isPro={isPro}
        onUpgrade={onUpgrade}
        tradeSettings={tradeSettings}
      />
      {invalidToast.element}
    </div>
  );
}
