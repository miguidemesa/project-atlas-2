"use client";

import Image from "next/image";
import { useState } from "react";
import { CardArt } from "@/components/cards/card-art";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/cn";

const LABELS = ["Front photo", "Back photo", "Surface photo"];
const labelFor = (i: number) => LABELS[i] ?? `Photo ${i + 1}`;

/** The seller's own photos, front first. Synthetic art only when a listing has none. */
export function Gallery({ listing }: { listing: Listing }) {
  const [active, setActive] = useState(0);
  const photos = listing.photos ?? [];

  if (photos.length === 0) {
    return (
      <div className="aspect-[3/4] overflow-hidden rounded-xl border border-line bg-elevated">
        <CardArt listing={listing} large />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-elevated">
        <Image
          src={photos[active]}
          alt={`${listing.title}, ${labelFor(active).toLowerCase()}`}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-contain"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2" role="group" aria-label="Listing photos">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={labelFor(i)}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 w-16 min-h-11 min-w-11 overflow-hidden rounded-lg border bg-elevated transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                i === active ? "border-gold" : "border-line hover:border-line-hv",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
