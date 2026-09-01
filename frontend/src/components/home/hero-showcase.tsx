"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { TiltCard, tierFor } from "@/components/cards/tilt-card";
import { CardImage } from "@/components/cards/card-image";
import type { Listing } from "@/lib/types";

const SLOTS = [
  { cls: "left-[2%] top-[6%] w-40 xl:w-48", depth: 0.5, tilt: "-6deg", floatDelay: "0s", z: "z-10" },
  { cls: "right-[4%] top-[30%] w-36 xl:w-44", depth: 0.9, tilt: "5deg", floatDelay: "-2.4s", z: "z-20" },
  { cls: "left-[24%] bottom-[2%] w-44 xl:w-52", depth: 0.7, tilt: "-2deg", floatDelay: "-4.8s", z: "z-30" },
];

/**
 * Fanned trio of featured cards for the hero. Each layer drifts at its own
 * parallax rate while scrolling and idles on a slow float; pointer tilt is
 * delegated to TiltCard.
 */
export function HeroShowcase({ listings }: { listings: Listing[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]"));
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress of the hero through the viewport: 1 → -1
      const p = ((vh / 2 - rect.top - rect.height / 2) / (vh + rect.height)) * 2;
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth ?? 0);
        layer.style.transform = `translateY(${(p * depth * 90).toFixed(1)}px)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className="relative hidden h-[430px] select-none lg:block xl:h-[480px]">
      {listings.slice(0, 3).map((listing, i) => {
        const slot = SLOTS[i];
        return (
          <div key={listing.id} data-depth={slot.depth} className={`absolute ${slot.cls} ${slot.z}`} style={{ "--tilt": slot.tilt } as React.CSSProperties}>
            <div className="floaty" style={{ "--tilt": slot.tilt, "--float-delay": slot.floatDelay, "--float-duration": `${6.5 + i}s` } as React.CSSProperties}>
              <TiltCard tier={tierFor(listing)}>
                <Link href={`/listing/${listing.id}`} tabIndex={-1} className="block aspect-[3/4] overflow-hidden rounded-xl border border-line-hv bg-elevated shadow-lifted" style={{ transform: `rotate(${slot.tilt})` }}>
                  <CardImage listing={listing} />
                </Link>
              </TiltCard>
            </div>
          </div>
        );
      })}
    </div>
  );
}
