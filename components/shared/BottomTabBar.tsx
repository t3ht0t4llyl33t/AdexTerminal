'use client';

import { Activity, ShieldAlert, Gift, Radar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId, Language } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { hapticSelection } from '@/lib/telegram-webapp';

interface BottomTabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  lang: Language;
}

const tabs: Array<{ id: TabId; icon: typeof Activity; key: Parameters<typeof translate>[1] }> = [
  { id: 'radar', icon: Radar, key: 'nav.radar' },
  { id: 'whales', icon: Activity, key: 'nav.whales' },
  { id: 'scanner', icon: ShieldAlert, key: 'nav.scanner' },
  { id: 'profile', icon: User, key: 'nav.profile' },
  { id: 'partners', icon: Gift, key: 'nav.partners' },
];

export function BottomTabBar({ active, onChange, lang }: BottomTabBarProps) {
  return (
    <nav className="dynamic-neon-footer w-full h-16 flex-none sticky bottom-0 z-50 bg-[#0C0C12]/95 backdrop-blur-md border-t border-purple-500/10 pb-safe px-3 pt-1 lg:hidden">
      <div className="flex items-center justify-around">
        {tabs.map(({ id, icon: Icon, key }) => {
          const isScanner = id === 'scanner';
          const isActive = active === id;

          return (
            <button
              key={id}
              onClick={() => {
                if (active !== id) hapticSelection();
                onChange(id);
              }}
              className={cn(
                'flex flex-col items-center gap-1 px-1.5 py-1 rounded-lg transition-all min-w-[48px] flex-1',
                isScanner && 'scanner-tab',
                isScanner && isActive && 'scanner-tab--active',
                isActive
                  ? 'text-accent-light'
                  : 'text-white/30 hover:text-white/60',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  isScanner && 'scanner-tab__icon',
                  isScanner && isActive && 'scanner-tab__icon--active',
                  isActive ? 'bg-white/10 shadow-[0_0_16px_rgba(255,255,255,0.45)] border border-white/35' : 'border border-transparent',
                )}
              >
                <Icon className={cn(isScanner ? 'w-4 h-4 text-fuchsia-100 drop-shadow-[0_0_6px_rgba(232,121,249,0.9)]' : 'w-4 h-4')} />
              </div>
              <span className={cn('text-[9px] font-mono uppercase tracking-wide', isScanner && 'scanner-tab__label', isScanner && isActive && 'scanner-tab__label--active')}>
                {translate(lang, key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
