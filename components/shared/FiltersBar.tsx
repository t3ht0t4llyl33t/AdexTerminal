'use client';

import { useState } from 'react';
import { Lock, Infinity as InfinityIcon, Settings2, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FiltersBarProps {
  lang: Language;
  spikeThreshold: number;
  minLiquidity: number;
  onSpikeChange: (v: number) => void;
  onLiquidityChange: (v: number) => void;
  isPro: boolean;
  onLockedClick: () => void;
}

const LIQ_MAX = 1000000;
const SPIKE_MAX = 500;

export function FiltersBar({
  lang,
  spikeThreshold,
  minLiquidity,
  onSpikeChange,
  onLiquidityChange,
  isPro,
  onLockedClick,
}: FiltersBarProps) {
  const [open, setOpen] = useState(false);
  const locked = !isPro;

  const liquidityLabel = minLiquidity >= LIQ_MAX
    ? '∞'
    : `$${(minLiquidity / 1000).toFixed(0)}K`;

  const spikeLabel = spikeThreshold >= SPIKE_MAX
    ? '∞'
    : `+${spikeThreshold}%`;

  const toggle = () => setOpen((o) => !o);

  return (
    <div className="space-y-2">
      <button
        onClick={toggle}
        className={cn(
          'relative overflow-hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border bg-[#071126]/80 transition-all shadow-[0_0_14px_rgba(192,38,211,0.15)]',
          open
            ? 'border-fuchsia-200 text-fuchsia-100 bg-fuchsia-400/15'
            : 'border-fuchsia-400/30 text-fuchsia-200 hover:border-fuchsia-300 hover:bg-fuchsia-400/10',
        )}
        aria-label={translate(lang, 'radar.filters')}
      >
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider">
          {translate(lang, 'radar.filters')}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="relative border border-fuchsia-400/35 bg-[#071126]/80 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-[0_0_20px_rgba(192,38,211,0.12)] animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-fuchsia-200/80 uppercase tracking-wider">
              {translate(lang, 'radar.filters')}
            </span>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${locked ? 'pointer-events-none' : ''}`}
            onClick={locked ? onLockedClick : undefined}
          >
            <div className={locked ? 'blur-[0.5px]' : ''}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono text-white/40 uppercase">
                  {translate(lang, 'radar.minLiquidity')}
                </label>
                <span className="text-[10px] font-mono text-accent-light font-bold flex items-center gap-0.5">
                  {minLiquidity >= LIQ_MAX && <InfinityIcon className="w-3 h-3" />}
                  {liquidityLabel}
                </span>
              </div>
              <Slider
                value={[Math.min(minLiquidity, LIQ_MAX)]}
                onValueChange={(v) => onLiquidityChange(v[0])}
                min={0}
                max={LIQ_MAX}
                step={10000}
              />
              <div className="flex justify-between text-[8px] font-mono text-white/20 mt-1">
                <span>$0</span>
                <span className="flex items-center gap-0.5"><InfinityIcon className="w-2.5 h-2.5" /> $1M+</span>
              </div>
            </div>

            <div className={locked ? 'blur-[0.5px]' : ''}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono text-white/40 uppercase">
                  {translate(lang, 'radar.spikeThreshold')}
                </label>
                <span className="text-[10px] font-mono text-accent-light font-bold flex items-center gap-0.5">
                  {spikeThreshold >= SPIKE_MAX && <InfinityIcon className="w-3 h-3" />}
                  {spikeLabel}
                </span>
              </div>
              <Slider
                value={[Math.min(spikeThreshold, SPIKE_MAX)]}
                onValueChange={(v) => onSpikeChange(v[0])}
                min={50}
                max={SPIKE_MAX}
                step={10}
              />
              <div className="flex justify-between text-[8px] font-mono text-white/20 mt-1">
                <span>+50%</span>
                <span className="flex items-center gap-0.5"><InfinityIcon className="w-2.5 h-2.5" /> +500%+</span>
              </div>
            </div>
          </div>

          {locked && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer bg-[#0a0820]/40 backdrop-blur-[1px] rounded-xl z-10"
              onClick={onLockedClick}
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
  );
}
