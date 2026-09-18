import { cn } from '@/lib/utils';
import type { Network } from '@/lib/types';

const networkStyles: Record<Network, string> = {
  TON: 'bg-[#0098EA]/10 text-[#0098EA] border-[#0098EA]/30',
  BSC: 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/30',
  BASE: 'bg-[#0052FF]/10 text-[#3B82F6] border-[#3B82F6]/30',
};

export function NetworkBadge({ network }: { network: Network }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border',
        networkStyles[network],
      )}
    >
      {network}
    </span>
  );
}
