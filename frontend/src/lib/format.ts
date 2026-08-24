export function formatPeso(amount: number): string {
  const whole = Math.round(amount);
  return `₱${whole.toLocaleString("en-PH")}`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [2592000, "d"],
    [31536000, "mo"],
  ];
  if (seconds < 60) return `${seconds}s ago`;
  for (let i = 1; i < units.length; i++) {
    if (seconds < units[i][0]) {
      return `${Math.floor(seconds / units[i - 1][0])}${units[i][1]} ago`;
    }
  }
  return `${Math.floor(seconds / 31536000)}y ago`;
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}
