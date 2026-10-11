import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cardSubtitle, formatPeso, type CardGroup } from "@atlas/api";
import { CardImage } from "./card-image";
import { ListingCard } from "./listing-card";

/** One tile per card: several sellers stack into "from ₱X" and "N sellers · conditions", and open the compare view; one seller is a normal tile. */
export function GroupTile({ group }: { group: CardGroup }) {
  if (group.sellers <= 1) return <ListingCard listing={group.lead} />;
  const { lead } = group;
  const href = `/browse?card=${encodeURIComponent(group.key)}&sort=price_asc`;
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-3">
      <div className="relative">
        {/* The sleeve behind: more than one copy of this card is for sale. */}
        <div aria-hidden className="absolute inset-0 translate-x-1.5 -translate-y-1.5 rounded-[12px] border border-well-line bg-well" />
        <div className="relative aspect-[63/88] overflow-hidden rounded-[12px] border border-well-line bg-well transition-colors group-hover:border-line-hv">
          <CardImage listing={lead} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold leading-5 text-ink">{lead.player}</span>
        <span className="truncate text-[13px] leading-[18px] text-ink-dim">{cardSubtitle(lead)}</span>
        <span className="t-price mt-1 text-ink">from {formatPeso(group.fromPrice)}</span>
        <span className="truncate text-xs text-ink-dim">{[`${group.sellers} sellers`, group.conditions.join(", ")].filter(Boolean).join(" · ")}</span>
        <span className="mt-1 flex items-center justify-between border-t border-line pt-2.5 text-[13px] text-ink-soft group-hover:text-ink">
          Compare {group.listings} listings
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
