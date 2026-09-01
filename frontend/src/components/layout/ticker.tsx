import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Mover {
  player: string;
  team: string;
  changePct: number;
  medianPrice: number;
}

export function MarketTicker({ movers }: { movers: Mover[] }) {
  const row = [...movers, ...movers];

  return (
    <div className="group relative overflow-hidden border-y border-line bg-elevated" aria-label="Player market trends">
      <div className="flex w-max gap-10 py-2.5 group-hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animation: "ticker 45s linear infinite" }}>
        {row.map((m, i) => (
          <span key={`${m.player}-${i}`} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span aria-hidden className={cn(m.changePct >= 0 ? "text-confirmed" : "text-urgent")}>
              {m.changePct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </span>
            <span className="font-medium text-ink">{m.player}</span>
            <span className="font-mono text-xs text-ink-faint">{m.team}</span>
            <span className={cn("font-mono text-xs", m.changePct >= 0 ? "text-confirmed" : "text-urgent")}>
              {m.changePct >= 0 ? "+" : ""}
              {m.changePct.toFixed(1)}%
            </span>
            <span className="font-mono text-xs text-ink-dim">{formatPeso(m.medianPrice)}</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
