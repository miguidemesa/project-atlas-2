import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DealScore } from "@/lib/types";

const STYLES: Record<DealScore["rating"], { label: string; cls: string }> = {
  great: { label: "Great deal", cls: "bg-confirmed/10 text-confirmed border-confirmed/30" },
  fair: { label: "Fair price", cls: "bg-raised text-ink-dim border-line" },
  above: { label: "Above market", cls: "bg-warn/10 text-warn border-warn/30" },
};

export function DealBadge({ score }: { score: DealScore }) {
  const meta = STYLES[score.rating];
  return (
    <span
      title={`vs ${formatPeso(score.medianPhp)} median across ${score.samples} recent sales`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        meta.cls,
      )}
    >
      {meta.label}
      <span className="font-mono tabular-nums">
        {score.deltaPct > 0 ? "+" : ""}
        {score.deltaPct.toFixed(1)}%
      </span>
    </span>
  );
}
