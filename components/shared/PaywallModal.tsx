'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Rocket, ExternalLink, Loader2, Wallet, Bot, Star, Search, LineChart, ShieldAlert } from 'lucide-react';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { trackEvent } from '@/lib/product-events';
import { authFetch } from '@/lib/api-client';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  isMiniApp: boolean;
}

const TELEGRAM_BOT_URL = 'https://t.me/aDEX_Live_Support_bot';
const PREMIUM_PRICE_USD_TARGET = 9.9;
const PREMIUM_PRICE_STARS = 555;
const FALLBACK_PRICE_TON = 3.3;

interface PricingSnapshot {
  price_ton: number;
  price_usd_target: number;
  updated_at: string | null;
  source: string;
}

interface TelegramWebAppShim {
  openInvoice?: (url: string, cb?: (status: string) => void) => void;
}

function getWebApp(): TelegramWebAppShim | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebAppShim } }).Telegram;
  return tg?.WebApp ?? null;
}

function formatTon(price: number): string {
  return price.toFixed(1).replace(/\.0$/, '');
}

function formatUsdTarget(target: number): string {
  return target % 1 === 0 ? `${target.toFixed(0)}` : `${target.toFixed(1)}`;
}

export function PaywallModal({ open, onClose, lang, isMiniApp }: PaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [highloadAddress, setHighloadAddress] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingSnapshot>({
    price_ton: FALLBACK_PRICE_TON,
    price_usd_target: PREMIUM_PRICE_USD_TARGET,
    updated_at: null,
    source: 'fallback',
  });
  const [tonConnectUI] = useTonConnectUI();
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/billing/ton-connect')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.highload_address) {
          setHighloadAddress(data.highload_address);
        }
      })
      .catch(() => {});

    fetch('/api/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && typeof data.price_ton === 'number') {
          setPricing({
            price_ton: data.price_ton,
            price_usd_target: data.price_usd_target ?? PREMIUM_PRICE_USD_TARGET,
            updated_at: data.updated_at ?? null,
            source: data.source ?? 'unknown',
          });
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  const pollProStatus = () => {
    if (pollRef.current) return;
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      try {
        const res = await authFetch('/api/referral-stats', {
          method: 'POST',
          body: JSON.stringify({ lang }),
        });
        const data = res.ok ? await res.json() : null;
        if (data?.ok && data.stats?.isPro) {
          window.clearInterval(pollRef.current!);
          pollRef.current = null;
          setSuccess(lang === 'RU' ? 'Premium активирован!' : 'Premium activated!');
        }
      } catch {
        // ignore
      }
      if (attempts >= 12 && pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 5000);
  };

  const handleTonConnectPayment = async () => {
    setError(null);
    setSuccess(null);
    trackEvent('pro_upgrade_started', { method: 'ton_connect' });

    if (!tonConnectUI?.wallet) {
      tonConnectUI?.openModal();
      return;
    }

    if (!highloadAddress) {
      setError(lang === 'RU' ? 'Кошелёк для оплаты не настроен' : 'Payment wallet not configured');
      return;
    }

    setLoading('ton_connect');
    try {
      const { toNano } = await import('@ton/core');

      const tonAmount = pricing.price_ton.toFixed(4);
      const nanoAmount = toNano(tonAmount).toString();

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: highloadAddress,
            amount: nanoAmount,
          },
        ],
      };

      await tonConnectUI.sendTransaction(tx);

      await authFetch('/api/billing/ton-connect', {
        method: 'POST',
        body: JSON.stringify({
          sender_address: tonConnectUI.wallet.account.address,
          tx_hash: 'pending_manual_verify',
          amount_ton: parseFloat(tonAmount),
          price_usd_target: pricing.price_usd_target,
        }),
      });

      setSuccess(lang === 'RU'
        ? 'Транзакция отправлена! Premium активируется после подтверждения в блокчейне (1-2 минуты).'
        : 'Transaction sent! Premium activates after blockchain confirmation (1-2 min).');
      trackEvent('pro_upgrade_completed', { method: 'ton_connect' });
    } catch {
      setError(lang === 'RU' ? 'Ошибка оплаты через TON Connect' : 'TON Connect payment failed');
    } finally {
      setLoading(null);
    }
  };

  const handleStarsPayment = async () => {
    setError(null);
    setSuccess(null);
    setLoading('stars');
    trackEvent('pro_upgrade_started', { method: 'stars' });

    try {
      const res = await authFetch('/api/billing/stars', {
        method: 'POST',
        body: JSON.stringify({ lang }),
      });

      if (!res.ok) throw new Error('stars invoice failed');
      const data = await res.json();
      if (!data.url) throw new Error('no url');

      const webApp = getWebApp();
      if (webApp?.openInvoice) {
        webApp.openInvoice(data.url, (status: string) => {
          if (status === 'paid') {
            setSuccess(lang === 'RU'
              ? 'Оплата получена! Premium активируется в течение минуты.'
              : 'Payment received! Premium activates within a minute.');
            trackEvent('pro_upgrade_completed', { method: 'stars' });
            pollProStatus();
          } else if (status === 'cancelled') {
            setError(lang === 'RU' ? 'Оплата отменена.' : 'Payment cancelled.');
          } else if (status === 'failed') {
            setError(lang === 'RU' ? 'Оплата не прошла.' : 'Payment failed.');
          }
        });
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        setSuccess(lang === 'RU'
          ? 'Счёт открыт. Premium активируется автоматически после оплаты.'
          : 'Invoice opened. Premium activates automatically after payment.');
        pollProStatus();
      }
    } catch {
      setError(lang === 'RU' ? 'Не удалось создать счёт Stars. Попробуйте позже.' : 'Failed to create Stars invoice. Try again later.');
    } finally {
      setLoading(null);
    }
  };

  const handleCryptoPay = async () => {
    setError(null);
    setSuccess(null);
    setLoading('crypto_pay');
    trackEvent('pro_upgrade_started', { method: 'crypto_pay' });

    try {
      const res = await authFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ lang }),
      });

      if (!res.ok) throw new Error('checkout failed');

      const data = await res.json();
      if (data.pay_url) {
        window.open(data.pay_url, '_blank', 'noopener,noreferrer');
        setSuccess(lang === 'RU'
          ? 'Счёт создан. Premium активируется автоматически после оплаты.'
          : 'Invoice created. Premium activates automatically after payment.');
      } else {
        throw new Error('No pay URL');
      }
    } catch {
      setError(lang === 'RU' ? 'Ошибка создания счёта. Попробуйте позже.' : 'Failed to create invoice. Try again later.');
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { icon: Search, key: 'paywall.feature.radar' as const, color: 'text-sky-300', bg: 'bg-sky-400/10 border-sky-400/30' },
    { icon: LineChart, key: 'paywall.feature.whale' as const, color: 'text-emerald-300', bg: 'bg-emerald-400/10 border-emerald-400/30' },
    { icon: ShieldAlert, key: 'paywall.feature.scanner' as const, color: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10 border-fuchsia-400/30' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#030510]/80 backdrop-blur-md" />
      <div
        className="relative bg-[#050a19] border border-fuchsia-400/40 rounded-2xl max-w-md w-full p-6 shadow-[0_0_40px_rgba(192,38,211,0.25)] animate-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-fuchsia-400/5 to-transparent pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4 relative">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isMiniApp
                ? 'bg-emerald-400/10 border border-emerald-300/50 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                : 'bg-fuchsia-500/10 border border-fuchsia-300/50 shadow-[0_0_20px_rgba(192,38,211,0.3)]'
            }`}
          >
            {isMiniApp ? (
              <Rocket className="w-7 h-7 text-emerald-300" />
            ) : (
              <Lock className="w-7 h-7 text-fuchsia-200" />
            )}
          </div>

          {!isMiniApp && (
            <h2 className="text-lg font-black text-white tracking-wide">
              {translate(lang, 'paywall.desktop.title')}
            </h2>
          )}

          {isMiniApp && (
            <div className="w-full flex flex-col gap-3">
              <p className="text-sm font-bold text-fuchsia-300 tracking-wide uppercase">
                {translate(lang, 'paywall.proFeaturesTitle')}
              </p>
              <div className="flex flex-col gap-2.5">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.key} className="flex items-start gap-2.5 text-left min-h-[2.5rem]">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${feature.bg}`}>
                        <Icon className={`w-4 h-4 ${feature.color}`} />
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed text-balance pt-1 min-w-0">
                        {translate(lang, feature.key)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isMiniApp && (
            <p className="text-sm text-white/50 leading-relaxed text-balance">
              {translate(lang, 'paywall.desktop.body')}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-400/80">{error}</p>
          )}

          {success && (
            <p className="text-xs text-emerald-300/90">{success}</p>
          )}

          {isMiniApp ? (
            <div className="w-full flex flex-col gap-2.5 mt-1">
              {/* 1. Primary CTA: TON Connect */}
              <button
                onClick={handleTonConnectPayment}
                disabled={loading !== null}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00D4FF] text-white hover:from-[#0098EA]/90 hover:to-[#00D4FF]/90 transition-all shadow-[0_0_24px_rgba(0,212,255,0.4),0_0_8px_rgba(0,152,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {loading === 'ton_connect' ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <Wallet className="w-4 h-4 flex-shrink-0" />
                )}
                <div className="flex flex-col items-center leading-tight">
                  <span className="font-bold text-sm">
                    {translate(lang, 'paywall.tonConnect')}{' '}
                    <span className="text-white/75 font-medium">({formatTon(pricing.price_ton)} TON)</span>
                  </span>
                  <span className="text-[11px] text-white/80 font-medium">
                    {`≤ ${formatUsdTarget(pricing.price_usd_target)} USD • rate locked twice daily`}
                  </span>
                </div>
              </button>

              {/* 2. Strong accent: Telegram Stars */}
              <button
                onClick={handleStarsPayment}
                disabled={loading !== null}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2AABEE] via-[#5B8DEF] to-[#7B61FF] text-white hover:brightness-110 transition-all shadow-[0_0_24px_rgba(91,141,239,0.45),0_0_8px_rgba(123,97,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {loading === 'stars' ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <Star className="w-4 h-4 flex-shrink-0 fill-white" />
                )}
                <div className="flex flex-col items-center leading-tight">
                  <span className="font-bold text-sm">
                    {translate(lang, 'paywall.stars')}{' '}
                    <span className="text-white/85 font-medium">({PREMIUM_PRICE_STARS} ⭐)</span>
                  </span>
                  <span className="text-[11px] text-white/80 font-medium">
                    {translate(lang, 'paywall.stars.hint')}
                  </span>
                </div>
              </button>

              {/* 3. Tertiary: Crypto Pay — transparent w/ neon outline */}
              <button
                onClick={handleCryptoPay}
                disabled={loading !== null}
                className="w-full py-2.5 rounded-xl bg-transparent border border-emerald-300/60 text-emerald-200 hover:bg-emerald-400/10 hover:border-emerald-300/90 transition-all shadow-[inset_0_0_14px_rgba(52,211,153,0.10),0_0_18px_rgba(52,211,153,0.18)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
              >
                {loading === 'crypto_pay' ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <Bot className="w-4 h-4 flex-shrink-0" />
                )}
                <div className="flex flex-col items-center leading-tight">
                  <span className="font-bold text-sm">
                    {translate(lang, 'paywall.cryptoPay')}{' '}
                    <span className="text-emerald-200/75 font-medium">({formatUsdTarget(pricing.price_usd_target)} USD)</span>
                  </span>
                  <span className="text-[11px] text-emerald-200/75 font-medium">
                    {translate(lang, 'paywall.cryptoPay.hint')}
                  </span>
                </div>
              </button>

              <p className="text-[10px] text-white/40 tracking-wide mt-1">
                {translate(lang, 'paywall.referralHint')}
              </p>
            </div>
          ) : (
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 py-3 rounded-xl bg-fuchsia-500/15 border border-fuchsia-300/50 text-fuchsia-200 font-bold text-sm hover:bg-fuchsia-500/25 transition-all flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(192,38,211,0.25)]"
            >
              {translate(lang, 'paywall.desktop.launch')}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={onClose}
            className="text-xs text-white/30 hover:text-white/60 transition-colors mt-0.5"
          >
            {translate(lang, 'paywall.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
