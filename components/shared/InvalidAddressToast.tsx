'use client';

import { useState, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { hapticNotify } from '@/lib/telegram-webapp';
import { translate } from '@/lib/i18n';
import type { Language } from '@/lib/types';

export function useInvalidAddressToast(lang: Language) {
  const [visible, setVisible] = useState(false);

  const notify = useCallback(() => {
    hapticNotify('warning');
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [visible]);

  const element = visible ? (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/90 border border-red-300/50 text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-fade-in backdrop-blur-sm pointer-events-none">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {translate(lang, 'common.invalidAddress')}
    </div>
  ) : null;

  return { element, notify };
}
