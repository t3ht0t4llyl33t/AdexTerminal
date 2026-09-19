'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import type { Language } from '@/lib/types';

interface ScamodarItem {
  address: string;
  network: string;
  reason: string | null;
  symbol: string | null;
  score: number | null;
  created_at: string;
}

interface ScamodarCardProps {
  lang: Language;
  variant?: 'app' | 'landing';
  onOpen?: (network: string, address: string) => void;
  initialItems?: ScamodarItem[];
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relativeTime(iso: string, lang: Language): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
  if (hours < 1) return lang === 'RU' ? 'меньше часа назад' : 'less than 1h ago';
  if (hours < 24) return lang === 'RU' ? `${hours}ч назад` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'RU' ? `${days}д назад` : `${days}d ago`;
}

export function ScamodarCard({ lang, variant = 'app', onOpen, initialItems }: ScamodarCardProps) {
  const [items, setItems] = useState<ScamodarItem[]>(initialItems ?? []);
  const [loaded, setLoaded] = useState<boolean>(!!initialItems);

  useEffect(() => {
    if (initialItems) return;
    let cancelled = false;
    fetch('/api/scamodar', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.ok && Array.isArray(json.items)) {
          setItems(json.items as ScamodarItem[]);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  const title = lang === 'RU' ? 'Свежие сигналы риска' : 'Fresh risk signals';
  const hint =
    lang === 'RU'
      ? 'Контракты, помеченные Сканером за последние 7 дней.'
      : 'Contracts flagged by the Scanner over the last 7 days.';

  const isLanding = variant === 'landing';

  return (
    <section
      className={
        isLanding
          ? 'rounded-2xl border border-white/10 bg-white/[0.02] p-6'
          : 'rounded-xl border border-amber-400/25 bg-amber-500/[0.03] p-3 sm:p-4'
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className={
            isLanding
              ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-300/20'
              : 'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-300/25'
          }
        >
          <ShieldAlert className={isLanding ? 'h-4 w-4 text-amber-300' : 'h-4 w-4 text-amber-300'} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className={isLanding ? 'text-base font-black text-white' : 'text-sm font-black text-white'}>
            {title}
          </h3>
          <p className={isLanding ? 'text-[11px] font-mono uppercase tracking-widest text-white/40' : 'text-[10px] font-mono uppercase tracking-widest text-white/45'}>
            {hint}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li
            className={
              isLanding
                ? 'rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-3 py-4 text-xs text-white/45'
                : 'rounded-md border border-dashed border-white/10 bg-white/[0.01] px-3 py-3 text-[11px] text-white/45'
            }
          >
            {loaded
              ? lang === 'RU'
                ? 'За последние 7 дней предупреждений не было.'
                : 'No warnings issued in the last 7 days.'
              : lang === 'RU'
                ? 'Загружаем последние сигналы…'
                : 'Loading recent signals…'}
          </li>
        ) : (
          items.map((it, idx) => {
            const label = it.symbol || shortAddr(it.address);
            const reason = it.reason || (lang === 'RU' ? 'Сигнал риска' : 'Risk signal');
            const clickable = variant === 'app' && !!onOpen;
            return (
              <li
                key={`${it.network}-${it.address}-${idx}`}
                className={
                  isLanding
                    ? 'flex items-start justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-3'
                    : 'flex items-start justify-between gap-3 rounded-md border border-white/8 bg-white/[0.02] px-3 py-2.5'
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{label}</span>
                    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-white/55">
                      {it.network}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60 line-clamp-2">
                    {reason}
                  </p>
                  <p className="mt-1 text-[10px] font-mono text-white/35">
                    {relativeTime(it.created_at, lang)} · {shortAddr(it.address)}
                  </p>
                </div>
                {clickable ? (
                  <button
                    onClick={() => onOpen?.(it.network, it.address)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-white/15 bg-white/[0.04] px-2 text-[10px] font-mono text-white/75 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {lang === 'RU' ? 'Открыть' : 'Open'}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

export type { ScamodarItem };
