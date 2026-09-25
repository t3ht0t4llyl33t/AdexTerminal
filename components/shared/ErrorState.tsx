'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import { translate, type TranslationKey } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  lang: Language;
  message?: TranslationKey;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ lang, message = 'common.error', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl border border-red-400/30 bg-red-400/5 flex items-center justify-center mb-4 shadow-[0_0_14px_rgba(239,68,68,0.12)]">
        <AlertCircle className="w-6 h-6 text-red-300/70" />
      </div>
      <p className="text-sm font-mono text-white/50 mb-4">
        {translate(lang, message)}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-100 text-xs font-bold font-mono uppercase tracking-wider hover:bg-fuchsia-400/20 hover:border-fuchsia-300/60 transition-all shadow-[0_0_14px_rgba(192,38,211,0.18)]"
        >
          <RotateCw className="w-3.5 h-3.5" />
          {translate(lang, 'common.retry')}
        </button>
      )}
    </div>
  );
}
