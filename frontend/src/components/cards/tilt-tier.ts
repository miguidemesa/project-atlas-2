import type { Listing } from "@/lib/types";

export type TiltTier = "standard" | "foil" | "premium" | "slab";

/** Pure, so server components (listing-card) can call it; tilt-card.tsx is client-only. */
export function tierFor(listing: Listing): TiltTier {
  if (listing.graded) return "slab";
  if (listing.parallel?.toLowerCase().includes("gold") || listing.numbered) return "premium";
  const p = listing.parallel?.toLowerCase() ?? "";
  if (p.includes("silver") || p.includes("holo") || p.includes("ice") || p.includes("crusade")) return "foil";
  return "standard";
}
