"use client";

import { useState } from "react";
import { CardImage } from "@/components/cards/card-image";
import { TiltCard, tierFor } from "@/components/cards/tilt-card";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/cn";

const ALL_VIEWS = [
  { key: "front", label: "Front" },
  { key: "reverse", label: "Reverse" },
  { key: "foil", label: "Foil detail" },
] as const;

export function Gallery({ listing }: { listing: Listing }) {
  const views = listing.imageUrl ? ALL_VIEWS.filter((v) => v.key !== "reverse") : ALL_VIEWS;
  const [view, setView] = useState<(typeof ALL_VIEWS)[number]["key"]>("front");
  const tier = tierFor(listing);

  return (
    <div>
      <TiltCard tier={tier}>
        <button
          type="button"
          aria-label="Inspect card artwork"
          className="block aspect-[3/4] w-full overflow-hidden rounded-xl border border-line bg-elevated shadow-lifted focus-visible:outline-gold"
        >
          <div
            className={cn(
              "relative h-full w-full transition-transform duration-500 ease-out",
              view === "foil" && listing.imageUrl && "scale-[1.75] origin-top-right",
              view === "foil" && !listing.imageUrl && "scale-[1.75]",
              view === "reverse" && "scale-x-[-1]",
            )}
          >
            <CardImage listing={listing} large eager />
          </div>
        </button>
      </TiltCard>

      <div className="mt-3 flex gap-2" role="tablist" aria-label="Card views">
        {views.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
              view === v.key ? "bg-raised text-ink" : "text-ink-dim hover:bg-elevated hover:text-ink",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-faint">
        {listing.imageUrl
          ? "Placeholder seed photo — replaced by the seller's own upload at listing time."
          : "Synthetic render — real photos ship with seller uploads."}
      </p>
    </div>
  );
}
