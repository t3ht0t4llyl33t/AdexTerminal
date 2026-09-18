'use client';

import { cn } from '@/lib/utils';
import type { Language, Network, NetworkSelection } from '@/lib/types';
import { translate } from '@/lib/i18n';

interface NetworkSwitcherProps {
  lang: Language;
  networks: NetworkSelection;
  onNetworksChange: (n: NetworkSelection) => void;
}

const allNetworks: Network[] = ['TON', 'BSC', 'BASE'];

const networkColors: Record<Network, { active: string; dot: string }> = {
  TON: { active: 'border-[#0098EA]/70 text-[#0098EA] bg-[#0098EA]/10', dot: 'bg-[#0098EA]' },
  BSC: { active: 'border-[#F0B90B]/70 text-[#F0B90B] bg-[#F0B90B]/10', dot: 'bg-[#F0B90B]' },
  BASE: { active: 'border-[#0052FF]/70 text-[#3B82F6] bg-[#0052FF]/10', dot: 'bg-[#3B82F6]' },
};

export function NetworkSwitcher({ lang, networks, onNetworksChange }: NetworkSwitcherProps) {
  const allOn = networks.length === allNetworks.length;

  const toggle = (n: Network) => {
    if (networks.includes(n)) {
      const next = networks.filter((x) => x !== n);
      if (next.length === 0) return;
      onNetworksChange(next);
    } else {
      onNetworksChange([...networks, n]);
    }
  };

  const selectAll = () => {
    onNetworksChange(allNetworks);
  };

  return (
    <div className="flex w-full sm:w-1/2 items-center gap-1 bg-[#050b1e] border border-fuchsia-400/40 rounded-lg p-1 shadow-[0_0_18px_rgba(192,38,211,0.18)] overflow-x-auto scrollbar-thin">
      <button
        onClick={selectAll}
        className={cn(
          'px-2.5 sm:px-3.5 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border',
          allOn
            ? 'bg-violet-400/15 text-violet-100 border-violet-300/70 shadow-[0_0_14px_rgba(139,92,246,0.3)]'
            : 'text-white/45 hover:text-white/80 hover:bg-violet-500/10 hover:border-violet-400/40 border-transparent',
        )}
      >
        {translate(lang, 'network.all')}
      </button>
      <div className="w-px h-5 bg-white/10" />
      {allNetworks.map((n) => {
        const on = networks.includes(n);
        const c = networkColors[n];
        return (
          <button
            key={n}
            onClick={() => toggle(n)}
            className={cn(
              'flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border',
              on
                ? c.active
                : 'text-white/35 hover:text-white/60 hover:bg-white/5 border-transparent',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', on ? c.dot : 'bg-white/20')} />
            {n}
          </button>
        );
      })}
    </div>
  );
}
