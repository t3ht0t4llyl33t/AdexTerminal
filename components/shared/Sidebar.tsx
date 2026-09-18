'use client';

import { Compass, Activity, ShieldAlert, User, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId, Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

interface SidebarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  lang: Language;
}

const tabs: Array<{ id: TabId; icon: typeof Compass; key: Parameters<typeof translate>[1] }> = [
  { id: 'radar', icon: Compass, key: 'nav.radar' },
  { id: 'whales', icon: Activity, key: 'nav.whales' },
  { id: 'scanner', icon: ShieldAlert, key: 'nav.scanner' },
  { id: 'profile', icon: User, key: 'nav.profile' },
  { id: 'partners', icon: Gift, key: 'nav.partners' },
];

export function Sidebar({ active, onChange, lang }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-16 border-r border-fuchsia-400/20 bg-[#050a19]/80 flex-shrink-0">
      <div className="flex flex-col items-center gap-1 py-4 flex-grow">
        {tabs.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'group relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
              active === id
                ? 'bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_16px_rgba(192,38,211,0.5)] border border-fuchsia-300/40'
                : 'text-white/30 hover:text-white/70 hover:bg-fuchsia-500/10',
            )}
          >
            {active === id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-fuchsia-300 shadow-[0_0_8px_rgba(192,38,211,0.8)]" />
            )}
            <Icon className="w-5 h-5" />
            <span className="text-[8px] font-mono uppercase tracking-wide">
              {translate(lang, key)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
