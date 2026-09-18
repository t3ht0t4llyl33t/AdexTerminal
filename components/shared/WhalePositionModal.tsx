'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Copy, Loader2, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import type { WhaleAlert, Language } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { CopyButton } from '@/components/shared/CopyButton';
import { formatAddress } from '@/components/shared/Format';
import { cn } from '@/lib/utils';
import { buildTradeLink, type TradeSettings, DEFAULT_TRADE_SETTINGS } from '@/lib/trade-links';

interface WhalePositionModalProps {
  whale: WhaleAlert | null;
  open: boolean;
  onClose: () => void;
  lang: Language;
  isPro: boolean;
  onUpgrade: () => void;
  tradeSettings?: TradeSettings;
}

interface PortfolioData {
  ok: boolean;
  wallet_address: string;
  token_address: string;
  network: string;
  trade_amount_usd: number;
  total_tokens_held: number;
  total_position_value_usd: number;
  token_price_usd: number;
  ai_verdict: string;
  cache_hit?: boolean;
  cache_age_seconds?: number;
  error?: string;
}

export function WhalePositionModal({
  whale,
  open,
  onClose,
  lang,
  isPro,
  onUpgrade,
  tradeSettings = DEFAULT_TRADE_SETTINGS,
}: WhalePositionModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!whale) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        wallet: whale.walletAddress,
        token: whale.tokenAddress,
        network: whale.network,
        trade_usd: String(whale.amountUsd),
        trade_type: whale.type,
        lang,
      });
      const res = await fetch(`/api/whales/portfolio?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = (await res.json()) as PortfolioData;
      setData(json);
    } catch {
      setError(translate(lang, 'whales.snapshotError'));
    } finally {
      setLoading(false);
    }
  }, [whale, lang]);

  useEffect(() => {
    if (open && whale && isPro) {
      setData(null);
      fetchPortfolio();
    }
  }, [open, whale, isPro, fetchPortfolio]);

  if (!open || !whale) return null;

  const isBuy = whale.type === 'buy';
  const mirrorLink = buildTradeLink(whale.network, whale.tokenAddress, tradeSettings);

  const rows = [
    {
      label: translate(lang, 'whales.snapshotWallet'),
      value: formatAddress(whale.walletAddress),
      icon: Activity,
      action: <CopyButton text={whale.walletAddress} canCopy={isPro} onLockedClick={onUpgrade} />,
    },
    {
      label: translate(lang, 'whales.snapshotTrade'),
      value: `$${whale.amountUsd.toLocaleString('en')}`,
      icon: isBuy ? TrendingUp : TrendingDown,
      valueClass: isBuy ? 'text-emerald-300' : 'text-red-300',
    },
    {
      label: translate(lang, 'whales.snapshotHeld'),
      value: loading
        ? '...'
        : data
          ? `${data.total_tokens_held.toLocaleString('en', { maximumFractionDigits: 2 })}`
          : '—',
      icon: Activity,
    },
    {
      label: translate(lang, 'whales.snapshotValue'),
      value: loading
        ? '...'
        : data
          ? `$${data.total_position_value_usd.toLocaleString('en', { maximumFractionDigits: 2 })}`
          : '—',
      icon: DollarSign,
      valueClass: 'text-emerald-300',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#030510]/85 backdrop-blur-md" />
      <div
        className="relative bg-gradient-to-br from-[#0b1428] via-[#070a1e] to-[#050414] border border-fuchsia-400/40 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(192,38,211,0.22)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-fuchsia-500/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-400/15 border border-fuchsia-400/40 flex items-center justify-center shadow-[0_0_14px_rgba(192,38,211,0.25)]">
              <Search className="w-4.5 h-4.5 text-fuchsia-200" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
              {translate(lang, 'whales.snapshotTitle')}
            </h2>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#0d1226]/60 border border-white/8"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <row.icon className="w-3.5 h-3.5 text-fuchsia-200/50 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-mono text-white/45 uppercase tracking-wide truncate">
                    {row.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn('text-xs sm:text-sm font-mono font-bold', row.valueClass ?? 'text-white')}>
                    {row.value}
                  </span>
                  {row.action}
                </div>
              </div>
            ))}

            <div className="px-3 py-3 rounded-lg bg-fuchsia-400/8 border border-fuchsia-400/25">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-fuchsia-200/60 uppercase tracking-wide">
                  {translate(lang, 'whales.snapshotVerdict')}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-fuchsia-200/60" />
                  <span className="text-xs font-mono text-white/40">...</span>
                </div>
              ) : error ? (
                <span className="text-xs font-mono text-red-300/80">{error}</span>
              ) : (
                <p className="text-xs sm:text-[13px] font-mono text-fuchsia-100/90 leading-relaxed">
                  {data?.ai_verdict ?? '—'}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <a
              href={mirrorLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-400 text-[#02130b] text-sm font-bold transition-all hover:bg-emerald-300 hover:scale-[1.02] shadow-[0_0_18px_rgba(52,211,153,0.4)]"
            >
              <Copy className="w-4 h-4" />
              {translate(lang, 'whales.mirrorTrade')}
            </a>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-white/15 text-white/60 text-sm font-bold hover:bg-white/5 hover:text-white/90 transition-all"
            >
              {translate(lang, 'common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
