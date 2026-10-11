import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Who sells it: avatar initial, name, and the verified mark (DESIGN.md: trust is visible). */
export function SellerLine({ name, verified, className }: { name: string; verified: boolean; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2 text-[13px]", className)}>
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-avatar font-display text-[10px] text-ink">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate font-medium text-ink-soft">{name}</span>
      {verified && <BadgeCheck size={15} strokeWidth={1.75} aria-label="Verified seller" role="img" className="ml-auto shrink-0 text-confirmed" />}
    </span>
  );
}
