export const TILT_MAX_DEG = 7;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pointer position across the card (0..1, 0..1) → the holo tilt transform (DESIGN.md › Holo Tilt). */
export function tiltTransform(px: number, py: number): string {
  const x = clamp01(px);
  const y = clamp01(py);
  const rx = (0.5 - y) * TILT_MAX_DEG * 2;
  const ry = (x - 0.5) * TILT_MAX_DEG * 2;
  return `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px) scale(1.025)`;
}
