"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { Listing } from "@/lib/types";

export type TiltTier = "standard" | "foil" | "premium" | "slab";

export function tierFor(listing: Listing): TiltTier {
  if (listing.graded) return "slab";
  if (listing.parallel?.toLowerCase().includes("gold") || listing.numbered) return "premium";
  const p = listing.parallel?.toLowerCase() ?? "";
  if (p.includes("silver") || p.includes("holo") || p.includes("ice") || p.includes("crusade")) return "foil";
  return "standard";
}

const MAX_DEG = 4;

export function TiltCard({
  tier,
  children,
  className,
}: {
  tier: TiltTier;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(hover: none)");
    enabled.current = !media.matches && !coarse.matches;
  }, []);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabled.current) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * MAX_DEG * 2;
    const ry = (px - 0.5) * MAX_DEG * 2;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px) scale(1.02)`;
    el.style.setProperty("--spot-x", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--spot-y", `${(py * 100).toFixed(1)}%`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "group/card relative transition-transform duration-300 ease-out will-change-transform",
        className,
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{
          background:
            tier === "slab"
              ? "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.14) 45%, rgba(198,162,75,0.10) 55%, transparent 70%)"
              : "linear-gradient(115deg, transparent 35%, rgba(237,230,214,0.12) 50%, transparent 65%)",
          backgroundSize: "220% 220%",
          backgroundPosition: "calc(var(--spot-x, 50%) - 60%) calc(var(--spot-y, 50%) - 60%)",
          borderRadius: "inherit",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{
          background: "radial-gradient(280px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(242,239,233,0.07), transparent 65%)",
          borderRadius: "inherit",
        }}
      />
      {children}
    </div>
  );
}
