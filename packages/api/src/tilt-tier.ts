import type { Listing } from "./types";

export type TiltTier = "standard" | "foil" | "premium" | "slab";

/** How strongly the foil light shows for each tier, on the web's tilt and the app's (spec section 8). */
export const FOIL_STRENGTH: Record<TiltTier, number> = { standard: 0.35, foil: 0.55, premium: 0.7, slab: 0.5 };

/** Pure, so server components can call it. Graded beats any parallel; gold or numbered beats silver and holo. */
export function tierFor(listing: Pick<Listing, "graded" | "parallel" | "numbered">): TiltTier {
  if (listing.graded) return "slab";
  if (listing.parallel?.toLowerCase().includes("gold") || listing.numbered) return "premium";
  const p = listing.parallel?.toLowerCase() ?? "";
  if (p.includes("silver") || p.includes("holo") || p.includes("ice") || p.includes("crusade")) return "foil";
  return "standard";
}
