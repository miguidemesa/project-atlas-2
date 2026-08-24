"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { CardImage } from "./card-image";
import { TiltCard, tierFor } from "./tilt-card";
import { Countdown } from "@/components/ui/countdown";
import { DealBadge } from "./deal-badge";
import { formatPeso, pctChange } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Listing } from "@/lib/types";

function TypeLabel({ listing }: { listing: Listing }) {
  const labels = { single_card: null, lot: "Lot", hobby_box: "Sealed", accessory: "Gear" } as const;
  const label = labels[listing.type];
  if (!label) return null;
  return (
    <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-dim">
      {label}
    </span>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.currentBid ?? listing.price;
  const change = pctChange(price, listing.previousPrice ?? 0);
  const tier = tierFor(listing);

  return (
    <TiltCard tier={tier}>
      <Link
        href={`/listing/${listing.id}`}
        className="group block overflow-hidden rounded-xl border border-line bg-elevated shadow-card transition-colors duration-200 hover:border-line-hv"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-base">
          <div className="relative h-full w-full overflow-hidden transition-transform duration-300 ease-out group-hover:scale-[1.03]">
            <CardImage listing={listing} />
          </div>

          <div className="absolute left-2 top-2 flex gap-1.5">
            {listing.format === "auction" ? (
              <span className="rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Auction</span>
            ) : (
              <span className="rounded bg-fixed/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Buy now</span>
            )}
            <TypeLabel listing={listing} />
          </div>

          <button
            type="button"
            aria-label={listing.watchers ? `Watch listing (${listing.watchers} watchers)` : "Watch listing"}
            onClick={(e) => {
              e.preventDefault();
              e.currentTarget.querySelector("svg")?.classList.toggle("fill-gold");
              e.currentTarget.querySelector("svg")?.classList.toggle("text-gold");
            }}
            className="absolute right-2 top-2 rounded-full bg-base/70 p-1.5 text-ink-dim backdrop-blur-sm transition-colors hover:text-gold"
          >
            <Heart size={15} />
          </button>
        </div>

        <div className="space-y-1.5 p-3.5">
          <p className="truncate font-medium text-ink">{listing.player}</p>
          <p className="truncate text-xs text-ink-dim">
            {listing.year} · {listing.set}
            {listing.parallel ? ` · ${listing.parallel}` : ""}
          </p>

          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-xl leading-none text-gold">{formatPeso(price)}</span>
            {listing.previousPrice && Math.abs(change) >= 3 && (
              <span className={cn("font-mono text-xs", change > 0 ? "text-confirmed" : "text-urgent")}>
                {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>

          {listing.format === "auction" ? (
            <div className="flex items-center justify-between pt-0.5">
              <Countdown endsAt={listing.endsAt!} />
              <span className="text-xs text-ink-dim">{listing.bidCount} bids</span>
            </div>
          ) : (
            <>
              <p className="pt-0.5 text-xs text-ink-dim">
                {listing.graded ? `${listing.gradingCompany} ${listing.gradeValue}` : "Raw"} · {listing.watchers ?? 0} watching
              </p>
              {listing.dealScore && (
                <div className="pt-1">{<DealBadge score={listing.dealScore} />}</div>
              )}
            </>
          )}
        </div>
      </Link>
    </TiltCard>
  );
}
