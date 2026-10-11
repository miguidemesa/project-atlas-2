import Link from "next/link";
import { CardImage } from "./card-image";
import { TiltCard } from "./tilt-card";
import { tierFor } from "@atlas/api";
import { DealBadge } from "./deal-badge";
import { Countdown } from "@/components/ui/countdown";
import { cardSubtitle, conditionTone, formatPeso, type ConditionTone } from "@atlas/api";
import { cn } from "@/lib/cn";
import { GameLine } from "@/components/ui/game-line";
import { SellerLine } from "@/components/ui/seller-line";
import type { Listing } from "@atlas/api";

const TONE_CLS: Record<ConditionTone, string> = {
  graded: "text-graded border-graded-line bg-graded-wash",
  confirmed: "text-confirmed border-confirmed/45",
  fixed: "text-fixed border-fixed/45",
  warn: "text-warn border-warn/45",
  urgent: "text-urgent border-urgent/45",
  plain: "text-ink-dim border-line-hv",
};

/** The grade ("PSA 10") or raw condition ("NM") as a chip, or null when the listing has neither. */
export function conditionChip(listing: Listing): { label: string; cls: string } | null {
  const tone = conditionTone(listing);
  return tone ? { label: tone.label, cls: TONE_CLS[tone.tone] } : null;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const chip = conditionChip(listing);
  const auction = listing.format === "auction" && listing.endsAt;

  return (
    <Link href={`/listing/${listing.id}`} className="group flex min-w-0 flex-col gap-3">
      <TiltCard tier={tierFor(listing)}>
        <div className="relative aspect-[63/88] overflow-hidden rounded-[12px] border border-well-line bg-well transition-[border-color,box-shadow] duration-[220ms] group-hover/card:border-transparent group-hover/card:shadow-lift">
          <CardImage listing={listing} />
          {listing.status === "sold" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-scrim">
              <span className="t-label rounded-full border border-line-strong px-3 py-1 uppercase text-ink">Sold</span>
            </div>
          )}
        </div>
      </TiltCard>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold leading-5 text-ink">{listing.player}</span>
          {chip && (
            <span className={cn("t-label inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full border px-2 uppercase", chip.cls)}>
              {chip.label}
            </span>
          )}
        </div>
        <span className="truncate text-[13px] leading-[18px] text-ink-dim">{cardSubtitle(listing)}</span>
        <span className="t-price mt-1 text-ink">{formatPeso(listing.currentBid ?? listing.price)}</span>
        {auction && (
          <span className="t-mono text-xs text-ink-dim">
            <Countdown endsAt={listing.endsAt!} /> · {listing.bidCount ?? 0} bids
          </span>
        )}
        <GameLine slug={listing.category} className="text-xs text-ink-faint" />
        {listing.dealScore && (
          <div className="pt-0.5">
            <DealBadge score={listing.dealScore} />
          </div>
        )}
        <SellerLine name={listing.sellerName} verified={listing.sellerVerified} className="mt-1 border-t border-line pt-2.5" />
      </div>
    </Link>
  );
}
