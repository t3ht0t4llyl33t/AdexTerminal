'use client';

import {
  Gift,
  Copy,
  Check,
  Send,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Rocket,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import type { ReferralStats, Language } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatUsd } from '@/components/shared/Format';
import { cn } from '@/lib/utils';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface PartnersScreenProps {
  stats: ReferralStats;
  lang: Language;
}

type WalletState = 'disconnected' | 'connecting' | 'connected';

export function PartnersScreen({ stats: initialStats, lang }: PartnersScreenProps) {
  const [copied, setCopied] = useState(false);
  const [walletState, setWalletState] = useState<WalletState>('disconnected');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const [liveStats, setLiveStats] = useState<ReferralStats>(initialStats);

  const tgUserId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('tgWebAppData')?.split('user=')?.[1]?.split('&')?.[0] ?? 'demo_user'
    : 'demo_user';

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/referral-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pending',
          telegram_user_id: tgUserId,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingAmount(data.pending_amount ?? 0);
    } catch {
      // silent
    }
  }, [tgUserId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/referral-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_user_id: tgUserId, lang }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.stats) {
        setLiveStats(data.stats);
        setPendingAmount(data.stats.pendingPayouts ?? 0);
      }
    } catch {
      // silent
    }
  }, [tgUserId, lang]);

  useEffect(() => {
    fetchPending();
    fetchStats();
  }, [fetchPending, fetchStats]);

  const handleCopy = () => {
    navigator.clipboard.writeText(liveStats.referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectTon = () => {
    tonConnectUI?.openModal();
  };

  const handleClaim = async (addr: string) => {
    if (pendingAmount <= 0) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/referral-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          telegram_user_id: tgUserId,
          wallet_address: addr,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.claimed > 0) {
          setClaimSuccess(true);
          setPendingAmount(0);
          setTimeout(() => setClaimSuccess(false), 4000);
        }
      }
    } catch {
      // silent
    }
    setClaiming(false);
  };

  const handleClaimRef = useRef(handleClaim);
  handleClaimRef.current = handleClaim;

  useEffect(() => {
    if (!tonConnectUI) return;

    const currentWallet = tonConnectUI.wallet;
    if (currentWallet) {
      setWalletAddress(currentWallet.account.address);
      setWalletState('connected');
    }

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        setWalletAddress(wallet.account.address);
        setWalletState('connected');
        handleClaimRef.current(wallet.account.address);
      } else {
        setWalletAddress(null);
        setWalletState('disconnected');
      }
    });
    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  const handleDisconnect = async () => {
    try {
      await fetch('/api/referral-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          telegram_user_id: tgUserId,
        }),
      });
    } catch {
      // silent
    }
    tonConnectUI?.disconnect();
    setWalletAddress(null);
    setWalletState('disconnected');
  };

  const handleShareTelegram = () => {
    const shareText = translate(lang, 'partners.shareMessage');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(liveStats.referralLink)}&text=${encodeURIComponent(shareText)}`;
    if (typeof window !== 'undefined') {
      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
      if (tg?.WebApp?.openTelegramLink) {
        tg.WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    }
  };

  const handleShareTwitter = () => {
    const shareText = translate(lang, 'partners.shareMessage');
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(liveStats.referralLink)}`;
    if (typeof window !== 'undefined') {
      window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const shortAddr = (addr: string | null) => {
    if (!addr) return '';
    return addr.length > 14
      ? `${addr.slice(0, 6)}...${addr.slice(-6)}`
      : addr;
  };

  const cardCls = 'border border-fuchsia-400/20 bg-[#0b0a1f]/80 rounded-2xl';
  const cardShadow = 'shadow-[0_0_18px_rgba(192,38,211,0.08)]';

  // ── Partners Screen ──
  const statCards = [
    {
      icon: Users,
      label: translate(lang, 'partners.totalInvited'),
      value: String(liveStats.totalReferrals),
      color: 'text-fuchsia-200',
      border: 'border-fuchsia-400/30',
      shadow: 'shadow-[0_0_16px_rgba(192,38,211,0.12)]',
      hint: undefined as string | undefined,
    },
    {
      icon: DollarSign,
      label: translate(lang, 'partners.earnedRewards'),
      value: `${liveStats.totalEarnings.toFixed(2)}`,
      color: 'text-emerald-300',
      border: 'border-emerald-400/30',
      shadow: 'shadow-[0_0_16px_rgba(52,211,153,0.12)]',
      hint: translate(lang, 'partners.earnedRewardsHint'),
    },
  ];

  const steps = [
    translate(lang, 'partners.step1'),
    translate(lang, 'partners.step2'),
    translate(lang, 'partners.step3'),
  ];

  return (
    <div className="w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4 scrollbar-none pb-8">
      {/* Hero block */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-fuchsia-400/50 flex-shrink-0 shadow-[0_0_14px_rgba(192,38,211,0.25)]">
            <img src="/referral-network.webp" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-base sm:text-lg font-black tracking-[0.06em] text-white uppercase truncate">
              {translate(lang, 'partners.title')}
            </h1>
            <p className="text-[10px] sm:text-xs text-fuchsia-200/60 mt-0.5 tracking-[0.08em] uppercase leading-tight line-clamp-2 whitespace-pre-line">
              {translate(lang, 'partners.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Unclaimed Rewards Banner */}
      {pendingAmount > 0 && walletState === 'disconnected' && (
        <div
          className="relative overflow-hidden rounded-2xl border border-violet-400/50 bg-violet-500/10 p-4 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
          style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-violet-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-violet-200">
                {translate(lang, 'partners.unclaimedTitle')}
              </p>
              <p className="text-xs text-violet-200/60 mt-1">
                {translate(lang, 'partners.unclaimedBody')} — ${pendingAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TON Connect & Security Warning */}
      <div className={cn(cardCls, cardShadow, 'p-4 sm:p-5')}>
        {/* Security Warning */}
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-400/20">
          <p className="text-[11px] text-amber-200/70 leading-relaxed">
            {translate(lang, 'partners.tonSecurityWarning')}
          </p>
        </div>

        {/* Connect / Connected State */}
        {walletState === 'disconnected' && (
          <button
            onClick={handleConnectTon}
            className="w-full py-4 rounded-xl bg-fuchsia-500/15 border border-fuchsia-300/40 text-fuchsia-200 hover:bg-fuchsia-500/25 transition-all flex items-center justify-center gap-3 shadow-[0_0_18px_rgba(192,38,211,0.2)]"
          >
            <Wallet className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-sm font-bold">{translate(lang, 'partners.connectTonLine1')}</span>
              <span className="text-[10px] text-fuchsia-200/60 font-mono">{translate(lang, 'partners.connectTonLine2')}</span>
            </div>
          </button>
        )}

        {walletState === 'connecting' && (
          <div className="w-full py-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-300/30 text-fuchsia-200/70 text-sm font-bold flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-fuchsia-300/40 border-t-fuchsia-300 rounded-full animate-spin" />
            {translate(lang, 'partners.connecting')}
          </div>
        )}

        {walletState === 'connected' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-4 py-3 bg-[#050414] border border-fuchsia-400/25 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-fuchsia-200 font-bold">
                  {translate(lang, 'partners.tonConnected')}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-[10px] font-mono text-red-300/70 hover:text-red-300 transition-colors"
              >
                {translate(lang, 'partners.disconnectWallet')}
              </button>
            </div>
            <div className="text-[10px] font-mono text-white/40 text-center">
              {shortAddr(walletAddress)}
            </div>
            {claimSuccess && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold text-center">
                {translate(lang, 'partners.claimSuccess')}
              </div>
            )}
            {claiming && (
              <div className="px-4 py-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-400/30 text-fuchsia-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-fuchsia-300/40 border-t-fuchsia-300 rounded-full animate-spin" />
                {translate(lang, 'partners.claiming')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Referral Link */}
      <div className={cn(cardCls, cardShadow, 'p-4 sm:p-5')}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(192,38,211,0.2)]">
            <Gift className="w-4.5 h-4.5 text-fuchsia-200" />
          </div>
          <span className="text-xs font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider">
            {translate(lang, 'partners.referralCode')}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 px-4 py-3 bg-[#050414] border border-fuchsia-400/25 rounded-xl font-mono text-sm text-fuchsia-200 font-bold tracking-wider">
            {liveStats.referralCode}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 min-w-0 px-4 py-3 bg-[#050414] border border-fuchsia-400/15 rounded-xl font-mono text-xs text-white/50 truncate">
            {liveStats.referralLink}
          </div>
          <button
            onClick={handleCopy}
            aria-label={translate(lang, 'partners.copyLink')}
            title={translate(lang, 'partners.copyLink')}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-fuchsia-500/15 border border-fuchsia-300/40 text-fuchsia-200 hover:bg-fuchsia-500/25 transition-all flex items-center justify-center shadow-[0_0_14px_rgba(192,38,211,0.15)]"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleShareTelegram}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-violet-500/15 border border-violet-400/50 text-violet-200 text-xs sm:text-sm font-bold hover:bg-violet-500/25 transition-all shadow-[0_0_18px_rgba(139,92,246,0.2)]"
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
          >
            <Send className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{translate(lang, 'partners.shareTelegram')}</span>
          </button>
          <button
            onClick={handleShareTwitter}
            aria-label={translate(lang, 'partners.shareTwitter')}
            title={translate(lang, 'partners.shareTwitter')}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-violet-500/15 border border-violet-400/50 text-violet-200 hover:bg-violet-500/25 transition-all shadow-[0_0_18px_rgba(139,92,246,0.2)]"
          >
            <span aria-hidden="true" className="text-3xl font-black leading-none tracking-[-0.08em]">𝕏</span>
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className={cn(cardCls, cardShadow, 'px-4 py-3 sm:px-5')}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex items-center justify-between gap-4 py-4',
              stat.label === statCards[0].label && 'border-b border-white/10',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <stat.icon className={cn('w-4 h-4 flex-shrink-0', stat.color)} />
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-white/60 uppercase leading-[1.25] break-words">
                  {stat.label}
                </span>
                {stat.hint && (
                  <span className="text-[10px] font-mono text-white/30 leading-[1.25] mt-0.5">
                    {stat.hint}
                  </span>
                )}
              </div>
            </div>
            <span className={cn('flex-shrink-0 text-base sm:text-lg font-mono font-bold leading-[1.25]', stat.color)}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Payout Info Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-r from-[#0d0a1f] via-[#0a0820] to-[#050414] p-4 sm:p-5 shadow-[0_0_22px_rgba(139,92,246,0.12)]">
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-sm text-violet-200/80 leading-relaxed font-medium">
            {translate(lang, 'partners.payoutInfo')}
          </p>
        </div>
      </div>

      {/* Commission highlight */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-[#0b0924] shadow-[0_0_26px_rgba(192,38,211,0.18)]">
        <img
          src="/referral-rocket.webp"
          alt=""
          className="absolute inset-y-0 right-[-6%] w-[66%] h-full object-cover object-center opacity-65 mix-blend-screen pointer-events-none"
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 38%, black 100%)' }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0b0924] via-[#0b0924]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0b0924]/40 via-transparent to-[#0b0924]/20 pointer-events-none" />
        <div className="absolute -left-8 -bottom-12 w-40 h-40 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-20 flex min-h-[112px] items-center gap-2.5 py-5 pl-5 pr-5 sm:gap-4 sm:pl-8 sm:pr-36">
          <div className="min-w-0 flex flex-col uppercase italic leading-none">
            <span className="text-[clamp(0.7rem,2.7vw,1rem)] font-sans font-black tracking-[0.08em] text-fuchsia-300 drop-shadow-[0_0_8px_rgba(232,121,249,0.35)]">
              {lang === 'RU' ? 'Реферальное' : 'Referral'}
            </span>
            <span className="mt-1 text-[clamp(1.1rem,4.5vw,1.8rem)] font-sans font-black tracking-[0.04em] text-fuchsia-100 drop-shadow-[0_0_12px_rgba(232,121,249,0.55)]">
              {lang === 'RU' ? 'Вознаграждение' : 'Reward'}
            </span>
          </div>
          <span className="commission-pulse flex-shrink-0 text-5xl sm:text-6xl font-sans font-black italic leading-none tracking-[-0.05em] text-fuchsia-100">
            {liveStats.commissionRate}%!
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className={cn(cardCls, cardShadow, 'p-4 sm:p-5')}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(192,38,211,0.2)]">
            <Rocket className="w-4.5 h-4.5 text-fuchsia-200" />
          </div>
          <span className="text-xs font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider">
            {translate(lang, 'partners.howItWorks')}
          </span>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-400/10 border border-fuchsia-300/40 flex items-center justify-center text-sm font-mono font-bold text-fuchsia-200 flex-shrink-0 shadow-[0_0_12px_rgba(192,38,211,0.15)]">
                {i + 1}
              </div>
              <p className="text-sm text-white/55 leading-relaxed pt-1.5">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
