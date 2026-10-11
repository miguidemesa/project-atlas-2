/** "1.4.0" gives [1, 4, 0]; null when any part isn't a whole number. */
function parts(version: string): number[] | null {
  const nums = version.trim().split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : Number.NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

/** True only when both versions are readable and current is older. A version the app can't read never locks anyone out. */
export function isBelowMinimum(current: string | undefined, minimum: string | undefined): boolean {
  const a = current ? parts(current) : null;
  const b = minimum ? parts(minimum) : null;
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}
