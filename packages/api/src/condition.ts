import type { Listing } from "./types";

export type ConditionTone = "graded" | "confirmed" | "fixed" | "warn" | "urgent" | "plain";

const TONES: Record<string, ConditionTone> = { NM: "confirmed", LP: "fixed", MP: "warn", HP: "urgent", DMG: "urgent" };

/** The grade ("PSA 10") or raw condition ("NM") with its status tone, or null when the listing has neither. */
export function conditionTone(
  listing: Pick<Listing, "graded" | "gradingCompany" | "gradeValue" | "condition">,
): { label: string; tone: ConditionTone } | null {
  if (listing.graded && listing.gradingCompany) {
    return { label: [listing.gradingCompany, listing.gradeValue].filter(Boolean).join(" "), tone: "graded" };
  }
  if (!listing.condition) return null;
  return { label: listing.condition, tone: TONES[listing.condition] ?? "plain" };
}
