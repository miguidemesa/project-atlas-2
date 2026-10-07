"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Pause, Play } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { conditionChip } from "@/components/cards/listing-card";
import { TiltCard } from "@/components/cards/tilt-card";
import { tierFor } from "@/components/cards/tilt-tier";
import { buttonPrimary } from "@/components/ui/button-styles";
import { GameLine } from "@/components/ui/game-line";
import { autoplays, carouselReducer, SLIDE_MS } from "@/lib/carousel";
import { cn } from "@/lib/cn";
import { cardSubtitle, formatPeso } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/** The store's featured capsule: a 5 s carousel on the web, a swipeable track on phones. */
export function FeaturedCarousel({ listings, label = "Featured" }: { listings: Listing[]; label?: string }) {
  const [state, dispatch] = useReducer(carouselReducer, { index: 0, count: listings.length, paused: false });
  const [held, setHeld] = useState(false);
  const reduced = usePrefersReducedMotion();
  const running = autoplays(state, reduced, held);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => dispatch({ type: "next" }), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [running, state.index]);

  if (listings.length === 0) return null;
  const current = listings[state.index];
  const chip = conditionChip(current);

  return (
    <>
      <section
        aria-roledescription="carousel"
        aria-label={label}
        className="hidden md:block"
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <div className="grid h-[460px] grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-line bg-elevated">
          <div className="relative overflow-hidden bg-stage">
            {current.imageUrl && (
              <Image src={current.imageUrl} alt="" aria-hidden fill sizes="40vw" className="scale-125 object-cover opacity-40 blur-2xl" />
            )}
            <div className="relative flex h-full items-center justify-center p-10">
              <TiltCard tier={tierFor(current)} className="aspect-[63/88] h-full max-h-[380px]">
                <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-well-line bg-well">
                  <CardImage listing={current} large eager />
                </div>
              </TiltCard>
            </div>
          </div>
          <div
            role="group"
            aria-roledescription="slide"
            aria-label={`${state.index + 1} of ${listings.length}: ${current.title}`}
            className="flex min-w-0 flex-col gap-3 p-8"
          >
            <GameLine slug={current.category} className="text-sm text-ink-dim" />
            <h3 className="t-title-1 line-clamp-2 text-ink">{current.title}</h3>
            <p className="text-sm text-ink-dim">{cardSubtitle(current)}</p>
            {chip && (
              <span className={cn("t-label inline-flex h-[22px] w-fit items-center rounded-full border px-2 uppercase", chip.cls)}>{chip.label}</span>
            )}
            <p className="t-price-lg mt-2 text-ink">{formatPeso(current.currentBid ?? current.price)}</p>
            <p className="text-sm text-ink-dim">Sold by {current.sellerName}</p>
            <Link href={`/listing/${current.id}`} className={cn(buttonPrimary, "mt-auto self-start")}>
              View listing
            </Link>
            {listings.length > 1 && (
              <div className="flex gap-2">
                {listings.map((l, i) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-label={`Show ${l.title}`}
                    aria-current={i === state.index ? "true" : undefined}
                    onClick={() => dispatch({ type: "go", index: i })}
                    className={cn(
                      "relative h-14 w-10 overflow-hidden rounded-md border bg-well",
                      i === state.index ? "border-accent" : "border-well-line opacity-70 hover:opacity-100",
                    )}
                  >
                    {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="40px" className="object-contain" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {listings.length > 1 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" aria-hidden>
              {listings.map((l, i) => (
                <span key={l.id} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  {i < state.index && <span className="block h-full w-full bg-ink-faint" />}
                  {i === state.index && (
                    <span key={`${state.index}-${running}`} className={cn("block h-full", running ? "foil-progress" : "w-full bg-ink-faint")} />
                  )}
                </span>
              ))}
            </div>
            <span className="t-mono text-ink-dim" aria-live={running ? "off" : "polite"}>
              {state.index + 1} of {listings.length}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "toggle" })}
              aria-label={state.paused ? "Play featured listings" : "Pause featured listings"}
              className="inline-flex size-11 items-center justify-center rounded-full border border-line-hv text-ink transition-colors hover:bg-hover-wash"
            >
              {state.paused ? <Play size={18} strokeWidth={1.75} aria-hidden /> : <Pause size={18} strokeWidth={1.75} aria-hidden />}
            </button>
          </div>
        )}
      </section>

      <section aria-label={label} className="md:hidden">
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4">
          {listings.map((l, i) => (
            <li key={l.id} className="w-[318px] shrink-0 snap-start">
              <Link
                href={`/listing/${l.id}`}
                aria-label={`${i + 1} of ${listings.length}: ${l.title}`}
                className="flex gap-3 rounded-[20px] border border-line bg-elevated p-3"
              >
                <span className="relative aspect-[63/88] w-28 shrink-0 overflow-hidden rounded-[12px] border border-well-line bg-well">
                  <CardImage listing={l} />
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 py-1">
                  <GameLine slug={l.category} className="text-xs text-ink-dim" />
                  <span className="line-clamp-2 text-[15px] font-semibold leading-5 text-ink">{l.title}</span>
                  <span className="truncate text-xs text-ink-dim">{cardSubtitle(l)}</span>
                  <span className="t-price mt-auto text-ink">{formatPeso(l.currentBid ?? l.price)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
