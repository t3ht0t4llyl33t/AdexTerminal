'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Language, TabId } from '@/lib/types';
import { translate } from '@/lib/i18n';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isLive: boolean;
  activeTab: TabId;
  isPro: boolean;
}

export function Header({
  lang,
  onToggleLang,
  isLive,
  activeTab,
  isPro,
}: HeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utc = now.toISOString().slice(11, 19);
      setTime(utc);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dynamic-neon-header w-full h-16 flex-none sticky top-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-purple-500/10 px-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="header-brand-plate relative flex items-center flex-shrink-0">
          <img
            src="/header_logo_cut.webp"
            alt="aDEX Terminal"
            className="header-brand-plate__image relative z-10 block w-full h-full object-contain"
          />
        </div>

        <div className="hidden md:flex items-center gap-1.5 ml-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border',
              isLive
                ? 'text-bull border-bull/30 bg-bull/5'
                : 'text-warn border-warn/30 bg-warn/5',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isLive ? 'bg-bull animate-pulse' : 'bg-warn',
              )}
            />
            {isLive ? translate(lang, 'radar.live') : translate(lang, 'radar.demo')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="hidden sm:block text-xs font-mono text-white/50 tabular-nums">
          {time} UTC
        </div>

        <button
          onClick={onToggleLang}
          aria-label={`Switch language, current language: ${lang}`}
          className="header-language-toggle flex items-center gap-1 px-2 py-1.5 rounded-md border border-bg-border bg-bg hover:bg-bg-hover flex-shrink-0 w-[68px] h-8 justify-center whitespace-nowrap"
        >
          <span
            className={cn(
              'text-[10px] font-mono font-bold px-1 rounded transition-colors',
              lang === 'RU' ? 'text-accent-light bg-accent/10' : 'text-white/40',
            )}
          >
            RU
          </span>
          <span className="text-[10px] text-white/20">|</span>
          <span
            className={cn(
              'text-[10px] font-mono font-bold px-1 rounded transition-colors',
              lang === 'EN' ? 'text-accent-light bg-accent/10' : 'text-white/40',
            )}
          >
            EN
          </span>
        </button>

        {isPro && (
          <span className="pro-badge flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-400/50 bg-emerald-400/10 text-emerald-300 text-[10px] font-mono font-black uppercase tracking-wider shadow-[0_0_12px_rgba(52,211,153,0.35)] animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
            PRO
          </span>
        )}
      </div>
    </header>
  );
}
