'use client';

import { useState, useMemo } from 'react';
import { Info, AlertTriangle, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { TokenRow, Language, NetworkSelection, ProSettings } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { NetworkBadge } from '@/components/shared/NetworkBadge';
import { DeltaBar } from '@/components/shared/DeltaBar';
import { CopyButton } from '@/components/shared/CopyButton';
import { FiltersBar } from '@/components/shared/FiltersBar';
import { NetworkSwitcher } from '@/components/shared/NetworkSwitcher';
import { formatUsd, formatAddress } from '@/components/shared/Format';
import { cn } from '@/lib/utils';
import { buildTradeLink, type TradeSettings, DEFAULT_TRADE_SETTINGS } from '@/lib/trade-links';

interface RadarScreenProps {
  tokens: TokenRow[];
  lang: Language;
  networks: NetworkSelection;
  onNetworksChange: (n: NetworkSelection) => void;
  isPro: boolean;
  onLockedClick: () => void;
  tradeSettings?: TradeSettings;
  proSettings?: ProSettings;
  onProSettingsChange?: (settings: Partial<ProSettings>) => void;
}

type SortKey = 'volume24h' | 'volumeSpike15m';
type SortDir = 'asc' | 'desc';

export function RadarScreen({
  tokens,
  lang,
  networks,
  onNetworksChange,
  isPro,
  onLockedClick,
  tradeSettings = DEFAULT_TRADE_SETTINGS,
  proSettings,
  onProSettingsChange,
}: RadarScreenProps) {
  const spikeThreshold = proSettings?.radar_min_spike ?? 50;
  const minLiquidity = proSettings?.radar_min_liquidity ?? 0;
  const [tooltipRow, setTooltipRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('volumeSpike15m');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    const result = tokens.filter((t) => {
      if (!networks.includes(t.network)) return false;
      if (isPro) {
        if (t.volumeSpike15m < spikeThreshold) return false;
        if (t.liquidity < minLiquidity) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const cmp = sortKey === 'volume24h' ? a.volume24h - b.volume24h : a.volumeSpike15m - b.volumeSpike15m;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result.slice(0, 50);
  }, [tokens, networks, isPro, spikeThreshold, minLiquidity, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="flex h-3 w-3 items-center justify-center flex-shrink-0">
      {sortKey !== col ? <ArrowUpDown className="w-3 h-3 opacity-40" /> : sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
    </span>
  );

  return (
    <div className="w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4 scrollbar-none pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-fuchsia-400/50 flex-shrink-0 shadow-[0_0_14px_rgba(192,38,211,0.25)] bg-gradient-to-br from-fuchsia-400/15 to-violet-500/10 flex items-center justify-center">
            <img
              src="/Radar_icon.webp"
              alt="Radar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-base sm:text-lg font-black tracking-[0.06em] text-white uppercase truncate">
              {translate(lang, 'radar.title')}
            </h1>
            <p className="text-[10px] sm:text-xs text-fuchsia-200/60 mt-0.5 tracking-[0.08em] uppercase leading-tight line-clamp-2">
              {translate(lang, 'radar.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="rounded-lg border border-fuchsia-400/35 bg-[#071126]/80 px-2 py-2 sm:px-3 sm:py-2.5 shadow-[0_0_14px_rgba(192,38,211,0.12)] text-center">
          <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-fuchsia-200/60 truncate">{lang === 'RU' ? 'Импульс' : 'Market pulse'}</div>
          <div className="mt-0.5 text-sm sm:text-base font-mono font-bold text-fuchsia-200 truncate">{formatUsd(filtered.reduce((sum, token) => sum + token.volume24h, 0))}</div>
          <div className="text-[8px] sm:text-[10px] text-fuchsia-200/50 mt-0.5 truncate">▲ {lang === 'RU' ? 'покупки' : 'buy volume'}</div>
        </div>
        <div className="rounded-lg border border-fuchsia-400/35 bg-[#071126]/80 px-2 py-2 sm:px-3 sm:py-2.5 shadow-[0_0_14px_rgba(192,38,211,0.12)] text-center">
          <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-fuchsia-200/60 truncate">{lang === 'RU' ? 'Пары' : 'Active pairs'}</div>
          <div className="mt-0.5 text-sm sm:text-base font-mono font-bold text-white">{filtered.length}</div>
          <div className="text-[8px] sm:text-[10px] text-fuchsia-200/50 mt-0.5 truncate">{lang === 'RU' ? 'real-time' : 'real-time'}</div>
        </div>
        <div className="rounded-lg border border-fuchsia-400/35 bg-[#071126]/80 px-2 py-2 sm:px-3 sm:py-2.5 shadow-[0_0_14px_rgba(192,38,211,0.12)] text-center">
          <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-fuchsia-200/60 truncate">{lang === 'RU' ? 'Всплеск' : 'Peak spike'}</div>
          <div className="mt-0.5 text-sm sm:text-base font-mono font-bold text-fuchsia-200 truncate">+{Math.max(...filtered.map((token) => token.volumeSpike15m), 0)}%</div>
          <div className="text-[8px] sm:text-[10px] text-fuchsia-200/50 mt-0.5 truncate">{lang === 'RU' ? '15 мин' : '15 min'}</div>
        </div>
      </div>

      <NetworkSwitcher lang={lang} networks={networks} onNetworksChange={onNetworksChange} />

      <FiltersBar
        lang={lang}
        spikeThreshold={spikeThreshold}
        minLiquidity={minLiquidity}
        onSpikeChange={(v) => onProSettingsChange?.({ radar_min_spike: v })}
        onLiquidityChange={(v) => onProSettingsChange?.({ radar_min_liquidity: v })}
        isPro={isPro}
        onLockedClick={onLockedClick}
      />

      <div className="flex-grow min-w-0 overflow-x-hidden overflow-y-hidden scrollbar-thin border border-fuchsia-400/35 bg-[#050a19]/90 rounded-xl shadow-[0_0_28px_rgba(192,38,211,0.16)]">
        <table className="w-full min-w-0 table-fixed text-left">
          <colgroup>
            <col className="w-[40%] sm:w-[18%]" />
            <col className="hidden sm:table-column sm:w-[9%]" />
            <col className="w-[25%] sm:w-[13%]" />
            <col className="w-[20%] sm:w-[13%]" />
            <col className="hidden md:table-column md:w-[15%]" />
            <col className="hidden lg:table-column lg:w-[12%]" />
            <col className="w-[15%] sm:w-[12%]" />
          </colgroup>
          <thead className="sticky top-0 bg-[#08132a] z-10">
            <tr className="border-b border-bg-border">
              <th className="px-1.5 sm:px-3 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider text-center">
                {translate(lang, 'radar.token')}
              </th>
              <th className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider hidden sm:table-cell text-center">
                {translate(lang, 'radar.network')}
              </th>
              <th
                className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider text-center cursor-pointer hover:text-fuchsia-200 select-none"
                onClick={() => toggleSort('volume24h')}
              >
                <span className="inline-flex items-center gap-1">
                  <span className="text-left leading-tight">
                    <span className="block">{lang === 'RU' ? 'Объём' : 'Volume'}</span>
                    <span className="block text-[8px] sm:text-[9px] text-fuchsia-200/50 leading-tight">24h</span>
                  </span>
                  <SortIcon col="volume24h" />
                </span>
              </th>
              <th
                className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider text-center cursor-pointer hover:text-fuchsia-200 select-none"
                onClick={() => toggleSort('volumeSpike15m')}
              >
                <span className="inline-flex items-center gap-1">
                  <span className="text-left leading-tight">
                    <span className="block">{lang === 'RU' ? 'Спайк' : 'Spike'}</span>
                    <span className="block text-[8px] sm:text-[9px] text-fuchsia-200/50 leading-tight">15m</span>
                  </span>
                  <SortIcon col="volumeSpike15m" />
                </span>
              </th>
              <th className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider hidden md:table-cell text-center">
                {translate(lang, 'radar.delta15m')}
              </th>
              <th className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider hidden lg:table-cell text-center">
                {translate(lang, 'radar.whaleRisk')}
              </th>
              <th className="px-1 sm:px-2 py-2.5 text-[9px] sm:text-[10px] font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider text-center">
                {lang === 'RU' ? 'Трейд' : 'Trade'}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-white/30 text-sm">
                  {translate(lang, 'radar.noData')}
                </td>
              </tr>
            ) : (
              filtered.map((token) => {
                const whaleSelling =
                  token.whaleSellVolume15m > token.whaleBuyVolume15m * 1.3;
                const highSpike = token.volumeSpike15m >= 250;

                return (
                  <tr
                    key={token.id}
                    className="border-b border-fuchsia-400/15 hover:bg-fuchsia-400/5 transition-colors group"
                  >
                    <td className="relative z-20 min-w-0 overflow-visible px-1.5 sm:px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-bg-hover border border-bg-border flex items-center justify-center text-[9px] font-mono font-bold text-accent-light flex-shrink-0">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white flex items-center gap-1 whitespace-nowrap">
                            ${token.symbol}
                            <span
                              className={cn(
                                'text-[9px] font-mono whitespace-nowrap',
                                token.priceChange24h >= 0
                                  ? 'text-bull'
                                  : 'text-bear',
                              )}
                            >
                              {token.priceChange24h >= 0 ? '+' : ''}
                              {token.priceChange24h.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-white/30 truncate max-w-[72px] sm:max-w-[100px]">
                              {formatAddress(token.address)}
                            </span>
                            <CopyButton text={token.address} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 w-[165%] max-w-[calc(100vw-2rem)] md:hidden">
                        <DeltaBar buy={token.buyPressure15m} sell={token.sellPressure15m} />
                      </div>
                    </td>

                    <td className="px-2 py-2.5 hidden sm:table-cell">
                      <NetworkBadge network={token.network} />
                    </td>

                    <td className="min-w-0 overflow-hidden px-1 sm:px-2 py-2.5 text-right text-[11px] sm:text-xs font-mono text-white/70 whitespace-nowrap">
                      {formatUsd(token.volume24h)}
                    </td>

                    <td className="min-w-0 overflow-hidden px-1 sm:px-2 py-2.5 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-0 max-w-full items-center justify-center rounded-md px-1 sm:px-2 py-1 text-[11px] sm:text-xs font-mono font-bold tabular-nums transition-all whitespace-nowrap',
                          highSpike
                            ? 'border border-fuchsia-400/70 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_12px_rgba(192,38,211,0.38)]'
                            : token.volumeSpike15m >= 150
                              ? 'text-emerald-300'
                              : 'text-white/55',
                        )}
                      >
                        +{token.volumeSpike15m}%
                      </span>
                    </td>

                    <td className="px-2 py-2.5 hidden md:table-cell">
                      <DeltaBar
                        buy={token.buyPressure15m}
                        sell={token.sellPressure15m}
                      />
                    </td>

                    <td className="px-2 py-2.5 hidden lg:table-cell">
                      {whaleSelling ? (
                        <div className="relative inline-flex">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-warn/10 text-warn border border-warn/30">
                            <AlertTriangle className="w-3 h-3" />
                            {translate(lang, 'radar.insiderDistribution')}
                          </span>
                          <button
                            onClick={() =>
                              setTooltipRow(
                                tooltipRow === token.id ? null : token.id,
                              )
                            }
                            className="ml-1 text-warn/50 hover:text-warn"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          {tooltipRow === token.id && (
                            <div className="absolute z-50 top-full mt-1 left-0 w-48 p-2 bg-bg-card border border-bg-border rounded-lg shadow-xl text-[10px] text-white/60 font-mono leading-relaxed animate-fade-in">
                              {translate(lang, 'radar.insiderTooltip')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-white/20">—</span>
                      )}
                    </td>

                    <td className="min-w-0 overflow-hidden px-1 sm:px-2 py-2.5 text-center">
                      <a
                        href={buildTradeLink(token.network, token.address, tradeSettings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={translate(lang, 'radar.mirrorLink')}
                        title={translate(lang, 'radar.mirrorLink')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent-light hover:bg-accent/25 hover:border-accent/50 transition-all"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
