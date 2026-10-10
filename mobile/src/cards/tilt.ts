/** Spec section 8: a phone card leans at most 6° toward the thumb (the web's pointer tilt allows 7°). */
export const TILT_MAX_DEG = 6;

export interface Tilt {
  rotateX: number; // degrees
  rotateY: number; // degrees
  /** Where the foil light sits, -0.5 to 0.5 of the card each way. */
  foilX: number;
  foilY: number;
}

/** The thumb's position across the card (0 to 1 each way; past the edge is clamped) → the tilt. Same signs as the web's tiltTransform. */
export function tiltFor(px: number, py: number): Tilt {
  "worklet";
  const x = Math.min(1, Math.max(0, px));
  const y = Math.min(1, Math.max(0, py));
  return { rotateX: (0.5 - y) * TILT_MAX_DEG * 2, rotateY: (x - 0.5) * TILT_MAX_DEG * 2, foilX: x - 0.5, foilY: y - 0.5 };
}
