'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchlistHeartProps {
  active: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  title?: string;
}

export function WatchlistHeart({ active, onToggle, disabled, title }: WatchlistHeartProps) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onToggle(!active);
      }}
      className={cn(
        'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors',
        active
          ? 'text-amber-300 hover:text-amber-200'
          : 'text-white/25 hover:text-white/60',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <Star
        className="h-3.5 w-3.5"
        strokeWidth={1.75}
        fill={active ? 'currentColor' : 'none'}
      />
    </button>
  );
}
