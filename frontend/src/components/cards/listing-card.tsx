"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { CardImage } from "./card-image";
import { TiltCard, tierFor } from "./tilt-card";
import { Countdown } from "@/components/ui/countdown";
import { recordAffinityEvent } from "@/lib/affinity";
import { DealBadge } from "./deal-badge";
import { formatPeso, pctChange } from "@/lib/format";
import { getSeller } from "@/lib/data";
import { cn } from "@/lib/cn";
import type { Listing } from "@/lib/types";

const CONDITION_CHIP: Record<string, string> = {
  NM: "text-[#34d399] border-[#34d399]/45",
  LP: "text-[#6ea8fe] border-[#6ea8fe]/45",
  MP: "text-[#f5a524] border-[#f5a524]/45",
};

function conditionChip(listing: Listing): { label: string; cls: string } | null {
  if (listing.graded && listing.gradingCompany) {
    return {
      label: `${listing.gradingCompany} ${listing.gradeValue}`,
      cls: "text-[#e2c078] border-[#d9b35e]/55 bg-[#d9b35e]/10",
    };
  }
  if (!listing.condition) return null;
  return { label: listing.condition, cls: CONDITION_CHIP[listing.condition] ?? "text-[#d4d4d8] border-white/20" };
}

export function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.currentBid ?? listing.price;
  const change = pctChange(price, listing.previousPrice ?? 0);
  const chip = conditionChip(listing);
  const seller = getSeller(listing.sellerId);
  const tier = tierFor(listing);

  return (
    <TiltCard tier={tier}>
      <Link href={`/listing/${listing.id}`} className="group flex min-w-0 flex-col gap-3">
      <div className="relative aspect-[63/88] overflow-hidden rounded-[10px] border border-[#232327] bg-[#141417] transition-[border-color] duration-200 ease-out group-hover:border-white/25">
        <CardImage listing={listing} />

        {listing.status === "sold" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <span className="rounded border border-white/30 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-white/90">
              Sold
            </span>
          </div>
        )}

        <button
          type="button"
          aria-label={listing.watchers ? `Watch listing (${listing.watchers} watchers)` : "Watch listing"}
          onClick={(e) => {
            e.preventDefault();
            const svg = e.currentTarget.querySelector("svg");
            const nowWatching = !svg?.classList.contains("fill-[#34d399]");
            svg?.classList.toggle("fill-[#34d399]", nowWatching);
            svg?.classList.toggle("text-[#34d399]", nowWatching);
            if (nowWatching) recordAffinityEvent(listing.category, "watch");
          }}
          className="absolute right-2 top-2 z-[5] rounded-full bg-black/50 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:text-[#34d399]"
        >
          <Heart size={15} />
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold leading-5 text-[#f4f4f5]">{listing.player}</span>
          {chip && (
            <span
              className={cn(
                "inline-flex h-[22px] flex-shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-bold uppercase tracking-wider",
                chip.cls,
              )}
            >
              {chip.label}
            </span>
          )}
        </div>
        <span className="truncate text-[13px] leading-[18px] text-[#a1a1aa]">
          {listing.year} · {listing.set}
          {listing.parallel ? ` · ${listing.parallel}` : ""}
        </span>

        <span className="mt-1.5 font-[family-name:var(--font-sans)] text-[17px] font-bold leading-[22px] tabular-nums text-[#f4f4f5]">
          {formatPeso(price)}
          {listing.previousPrice && Math.abs(change) >= 3 && (
            <span className={cn("ml-2 text-[13px] font-semibold tabular-nums", change > 0 ? "text-[#34d399]" : "text-[#f58b8b]")}>
              {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </span>

        {listing.format === "auction" ? (
          <div className="flex items-center justify-between text-[12px] text-[#8a8a93]">
            <Countdown endsAt={listing.endsAt!} />
            <span>{listing.bidCount} bids</span>
          </div>
        ) : (
          <span className="truncate text-[12px] leading-4 text-[#8a8a93]">{seller.displayName}</span>
        )}

        {listing.dealScore && <div className="pt-0.5">{<DealBadge score={listing.dealScore} />}</div>}
      </div>
      </Link>
    </TiltCard>
  );
}
