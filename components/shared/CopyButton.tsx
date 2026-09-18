'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticImpact, hapticNotify } from '@/lib/telegram-webapp';

interface CopyButtonProps {
  text: string;
  className?: string;
  /** When false, copying is blocked and onLockedClick fires instead (Pro-gated data). */
  canCopy?: boolean;
  onLockedClick?: () => void;
}

export function CopyButton({ text, className, canCopy = true, onLockedClick }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canCopy) {
      hapticNotify('warning');
      onLockedClick?.();
      return;
    }
    navigator.clipboard.writeText(text).catch(() => {});
    hapticImpact('light');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded transition-colors',
        'hover:bg-bg-hover text-white/40 hover:text-accent',
        copied && 'text-bull',
        !canCopy && 'text-fuchsia-200/60 hover:text-fuchsia-100',
        className,
      )}
      title={
        canCopy
          ? 'Copy to clipboard'
          : 'PRO only — copy requires an aDex Pro subscription'
      }
    >
      {copied && canCopy ? (
        <Check className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}
