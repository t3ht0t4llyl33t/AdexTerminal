interface DeltaBarProps {
  buy: number;
  sell: number;
}

export function DeltaBar({ buy, sell }: DeltaBarProps) {
  const total = buy + sell || 1;
  const buyPct = (buy / total) * 100;
  const sellPct = (sell / total) * 100;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-bg-border flex">
        <div
          className="h-full rounded-l-full transition-all duration-500"
          style={{
            width: `${buyPct}%`,
            background: 'linear-gradient(90deg, rgba(16,185,129,0.8), #10B981)',
            boxShadow: '0 0 6px rgba(16,185,129,0.3)',
          }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{
            width: `${sellPct}%`,
            background: 'linear-gradient(90deg, #EF4444, rgba(239,68,68,0.8))',
            boxShadow: '0 0 6px rgba(239,68,68,0.3)',
          }}
        />
      </div>
      <div className="flex items-center gap-1 text-[10px] font-mono whitespace-nowrap">
        <span className="text-bull">{buyPct.toFixed(0)}%</span>
        <span className="text-white/20">/</span>
        <span className="text-bear">{sellPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
