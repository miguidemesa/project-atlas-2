import Link from "next/link";
import { CardImage } from "./card-image";
import { TiltCard } from "./tilt-card";
import { tierFor } from "./tilt-tier";
import { DealBadge } from "./deal-badge";
import { Countdown } from "@/components/ui/countdown";
import { cardSubtitle, formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Listing } from "@/lib/types";

const CONDITION_CHIP: Record<string, string> = {
  NM: "text-confirmed border-confirmed/45",
  LP: "text-fixed border-fixed/45",
  MP: "text-warn border-warn/45",
  HP: "text-urgent border-urgent/45",
  DMG: "text-urgent border-urgent/45",
};

/** The grade ("PSA 10") or raw condition ("NM") as a chip, or null when the listing has neither. */
export function conditionChip(listing: Listing): { label: string; cls: string } | null {
  if (listing.graded && listing.gradingCompany) {
    const label = [listing.gradingCompany, listing.gradeValue].filter(Boolean).join(" ");
    return { label, cls: "text-gold border-gold/55 bg-gold/10" };
  }
  if (!listing.condition) return null;
  return { label: listing.condition, cls: CONDITION_CHIP[listing.condition] ?? "text-ink-dim border-line-hv" };
}

export function ListingCard({ listing }: { listing: Listing }) {
  const chip = conditionChip(listing);

  return (
    <TiltCard tier={tierFor(listing)}>
      <Link href={`/listing/${listing.id}`} className="group flex min-w-0 flex-col gap-3">
        <div className="relative aspect-[63/88] overflow-hidden rounded-[10px] border border-line bg-elevated transition-[border-color] duration-200 ease-out group-hover:border-line-hv">
          <CardImage listing={listing} />
          {listing.status === "sold" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-base/60">
              <span className="rounded border border-line-hv px-3 py-1 text-sm font-semibold uppercase tracking-wider text-ink">Sold</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[15px] font-semibold leading-5 text-ink">{listing.player}</span>
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
          <span className="truncate text-[13px] leading-[18px] text-ink-dim">{cardSubtitle(listing)}</span>
          <span className="mt-1.5 text-[17px] font-bold leading-[22px] tabular-nums text-ink">
            {formatPeso(listing.currentBid ?? listing.price)}
          </span>
          {listing.format === "auction" && listing.endsAt ? (
            <div className="flex items-center justify-between text-[12px] text-ink-faint">
              <Countdown endsAt={listing.endsAt} />
              <span>{listing.bidCount ?? 0} bids</span>
            </div>
          ) : (
            <span className="truncate text-[12px] leading-4 text-ink-faint">{listing.sellerName}</span>
          )}
          {listing.dealScore && (
            <div className="pt-0.5">
              <DealBadge score={listing.dealScore} />
            </div>
          )}
        </div>
      </Link>
    </TiltCard>
  );
}
