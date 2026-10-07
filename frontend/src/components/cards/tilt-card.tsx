"use client";

import { useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { tiltTransform } from "./tilt-math";
import type { TiltTier } from "./tilt-tier";

const FOIL_STRENGTH: Record<TiltTier, number> = { standard: 0.35, foil: 0.55, premium: 0.7, slab: 0.5 };

/**
 * The holo tilt, Atlas's one authored motion: on fine pointers the card leans toward the
 * pointer and foil light follows it; on touch a press runs one sweep. Never under reduced motion.
 */
export function TiltCard({ tier, children, className }: { tier: TiltTier; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [sweeping, setSweeping] = useState(false);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = tiltTransform(px, py);
    el.style.setProperty("--spot-x", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--spot-y", `${(py * 100).toFixed(1)}%`);
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" && !reduced) setSweeping(true);
      }}
      onAnimationEnd={() => setSweeping(false)}
      className={cn(
        "group/card relative transition-transform duration-[320ms] ease-out will-change-transform active:scale-[0.98]",
        sweeping && "holo-sweep",
        className,
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
      <span
        data-foil
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[12px] opacity-0 mix-blend-screen transition-opacity duration-[320ms] group-hover/card:opacity-[var(--foil)]"
        style={
          {
            "--foil": FOIL_STRENGTH[tier],
            background:
              "linear-gradient(115deg, transparent 20%, var(--color-foil-1) 36%, var(--color-foil-2) 46%, var(--color-foil-3) 56%, var(--color-foil-4) 66%, transparent 80%)",
            backgroundSize: "240% 240%",
            backgroundPosition: "var(--spot-x, 50%) var(--spot-y, 50%)",
          } as CSSProperties
        }
      />
    </div>
  );
}
