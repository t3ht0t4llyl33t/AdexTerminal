import { Shield } from 'lucide-react';
import type { Language } from '@/lib/types';
import { translate } from '@/lib/i18n';

export function RiskAdvisory({ lang }: { lang: Language }) {
  return (
    <div className="bg-[#071126]/60 border border-amber-400/25 rounded-xl px-4 py-3 mt-auto shadow-[0_0_14px_rgba(251,191,36,0.08)]">
      <div className="flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-1">
            {translate(lang, 'risk.advisoryLabel')}
          </div>
          <p className="text-[11px] leading-relaxed text-white/45 font-mono">
            {translate(lang, 'risk.advisory')}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-amber-200/60 font-mono uppercase tracking-wide">
            {translate(lang, 'risk.nfaLine')}
          </p>
        </div>
      </div>
    </div>
  );
}
