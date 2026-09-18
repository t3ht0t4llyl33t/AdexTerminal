'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, ArrowRight, Radar, Activity, ShieldAlert } from 'lucide-react';
import type { Language } from '@/lib/types';

const TELEGRAM_MINIAPP_URL = 'https://t.me/aDEX_Live_Support_bot/app';
const PREVIEW_FLAG_KEY = 'adex-desktop-preview';

interface DesktopGateProps {
  lang: Language;
}

function isTelegramEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const tg = (window as unknown as {
      Telegram?: { WebApp?: { initData?: string } };
    }).Telegram;
    if (tg?.WebApp?.initData && tg.WebApp.initData.length > 0) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('tgWebAppData')) return true;
    if (navigator.userAgent.includes('Telegram')) return true;
    if (window.location !== window.parent.location) return true;
    return false;
  } catch {
    return true;
  }
}

function logVisit(action: 'landing_shown' | 'opened_in_telegram' | 'continued_as_preview') {
  fetch('/api/desktop-visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
    keepalive: true,
  }).catch(() => {});
}

export function DesktopGate({ lang }: DesktopGateProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isTelegramEnvironment()) return;
    try {
      if (window.localStorage.getItem(PREVIEW_FLAG_KEY) === 'yes') return;
    } catch {
      // fall through
    }
    setVisible(true);
    logVisit('landing_shown');
  }, []);

  if (!visible) return null;

  const t = {
    eyebrow: lang === 'RU' ? 'aDEX Terminal • Telegram-first' : 'aDEX Terminal • Telegram-first',
    heading:
      lang === 'RU'
        ? 'Терминал живёт внутри Telegram'
        : 'This terminal runs inside Telegram',
    body:
      lang === 'RU'
        ? 'Радар всплесков объёма, лупа кита и сканер контрактов заточены под мини-приложение Telegram — TON Connect, платежи в TON и мгновенные алерты работают только там.'
        : 'Volume spike radar, whale x-ray and contract scanner are tuned for the Telegram Mini App — TON Connect, TON payments and instant alerts only fire in there.',
    openBtn: lang === 'RU' ? 'Открыть в Telegram' : 'Open in Telegram',
    previewBtn:
      lang === 'RU'
        ? 'Продолжить как превью (без оплаты и алертов)'
        : 'Continue as preview (no payments or alerts)',
    hint:
      lang === 'RU'
        ? 'Подсказка: откройте эту страницу с телефона или через Telegram Desktop.'
        : 'Tip: open this page from your phone or through Telegram Desktop.',
    featureRadar: lang === 'RU' ? 'Радар объёма 15м' : '15m volume radar',
    featureWhale: lang === 'RU' ? 'Лупа кита в реальном времени' : 'Live whale x-ray',
    featureScanner: lang === 'RU' ? 'Сканер контрактов' : 'Contract scanner',
  };

  const handleOpen = () => {
    logVisit('opened_in_telegram');
    window.open(TELEGRAM_MINIAPP_URL, '_blank', 'noopener,noreferrer');
  };

  const handleContinue = () => {
    logVisit('continued_as_preview');
    try {
      window.localStorage.setItem(PREVIEW_FLAG_KEY, 'yes');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-5 py-6 bg-[#050510]/95 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.08),transparent_60%),radial-gradient(circle_at_bottom,rgba(192,38,211,0.06),transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0B14]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="flex flex-col items-center text-center gap-5 px-6 pt-7 pb-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/header_logo_cut.webp"
              alt="aDEX Terminal"
              width={28}
              height={28}
              className="rounded"
              priority
            />
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50">
              {t.eyebrow}
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight leading-tight text-balance">
            {t.heading}
          </h2>

          <p className="text-sm text-white/60 leading-relaxed text-balance">{t.body}</p>

          <div className="w-full grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: Radar, label: t.featureRadar },
              { icon: Activity, label: t.featureWhale },
              { icon: ShieldAlert, label: t.featureScanner },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2.5 flex flex-col items-center gap-1.5"
              >
                <Icon className="w-4 h-4 text-white/70" strokeWidth={1.5} />
                <span className="text-[10px] font-mono uppercase tracking-wide text-white/50 leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleOpen}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00D4FF] text-white font-bold text-sm hover:from-[#0098EA]/90 hover:to-[#00D4FF]/90 transition-all shadow-[0_0_28px_rgba(0,212,255,0.35)] flex items-center justify-center gap-2 mt-1"
          >
            {t.openBtn}
            <ExternalLink className="w-4 h-4" />
          </button>

          <button
            onClick={handleContinue}
            className="text-xs text-white/45 hover:text-white/75 transition-colors flex items-center gap-1.5"
          >
            {t.previewBtn}
            <ArrowRight className="w-3 h-3" />
          </button>

          <p className="text-[11px] text-white/30 leading-relaxed">{t.hint}</p>
        </div>
      </div>
    </div>
  );
}
