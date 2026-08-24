"use client";

import { useEffect, useRef } from "react";
import { CardImage } from "@/components/cards/card-image";
import { TiltCard, tierFor } from "@/components/cards/tilt-card";
import type { Listing } from "@/lib/types";

const STEPS = [
  { title: "See the full market.", body: "Every listing carries its 90-day price history — medians, momentum, recent sales. No guesswork." },
  { title: "Bid with the median in sight.", body: "Quick-increment bidding against real comps, not hype. The chart is always one glance away." },
  { title: "Escrow-protected, every time.", body: "Funds release only when you confirm delivery in hand. Both sides stay honest." },
];

/**
 * Scroll-scrubbed showcase: the card un-tilts and settles to true while
 * three trust steps cross-fade. Transform/opacity only; static under
 * reduced motion.
 */
export function GrailShowcase({ listing }: { listing: Listing }) {
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = rect.height - vh;
      if (scrollable <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / scrollable));

      const stage = stageRef.current;
      if (stage) {
        const settle = 1 - p; // 1 at start → 0 at end
        stage.style.transform = `perspective(1100px) rotateX(${(settle * 14).toFixed(2)}deg) scale(${(0.78 + 0.22 * p).toFixed(3)})`;
        stage.style.opacity = String(Math.min(1, 0.35 + p * 1.4));
      }
      stepRefs.current.forEach((el, i) => {
        if (!el) return;
        const center = (i + 0.5) / STEPS.length;
        const d = Math.abs(p - center) / (1 / STEPS.length); // 0 centered → 1 edge
        const vis = Math.max(0, 1 - d * 1.6);
        el.style.opacity = String(vis);
        el.style.transform = `translateY(${((1 - vis) * 18).toFixed(1)}px)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrapRef} className="relative h-[260vh]" aria-label="How Atlas works">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">How Atlas works</p>
            <div className="relative mt-6 h-[300px] sm:h-[330px]">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className="absolute inset-x-0 top-0 will-change-transform"
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  <h2 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">{step.title}</h2>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-ink-dim">{step.body}</p>
                  <p className="mt-6 font-mono text-sm text-ink-faint">{`0${i + 1} / 03`}</p>
                </div>
              ))}
            </div>
            <noscript>
              <ul className="space-y-3 text-sm text-ink-dim">
                {STEPS.map((s) => (
                  <li key={s.title}>
                    <strong className="text-ink">{s.title}</strong> {s.body}
                  </li>
                ))}
              </ul>
            </noscript>
          </div>

          <div ref={stageRef} className="mx-auto w-full max-w-[340px] will-change-transform" style={{ transformOrigin: "center top" }}>
            <TiltCard tier={tierFor(listing)}>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-line-hv bg-elevated shadow-lifted">
                <CardImage listing={listing} large />
              </div>
            </TiltCard>
            <p className="mt-4 text-center font-display text-xl text-ink">{listing.player}</p>
            <p className="text-center font-mono text-xs text-ink-faint">
              {listing.year} · {listing.set}
              {listing.gradingCompany ? ` · ${listing.gradingCompany} ${listing.gradeValue}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
