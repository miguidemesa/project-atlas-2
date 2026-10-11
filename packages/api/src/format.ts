export function formatPeso(amount: number): string {
  const whole = Math.round(amount);
  return `₱${whole.toLocaleString("en-PH")}`;
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

const LANGUAGES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  id: "Indonesian",
  th: "Thai",
  other: "Other",
};

/** Language codes the API accepts, in display order. */
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGES) as [string, string][];

export function languageName(code: string): string {
  return LANGUAGES[code] ?? code;
}

/** "2023 · Prizm 136 · Silver": only the parts a listing actually has. */
export function cardSubtitle(l: {
  year?: number | null;
  set: string;
  cardNumber?: string | null;
  parallel?: string | null;
}): string {
  return [l.year, [l.set, l.cardNumber].filter(Boolean).join(" "), l.parallel].filter(Boolean).join(" · ");
}

const MINUTE = 60_000;

/** An auction's time left as a short countdown, or "Ended". */
export function timeLeft(endsAt: string, now = Date.now()): string {
  const minutes = Math.floor((new Date(endsAt).getTime() - now) / MINUTE);
  if (minutes < 0) return "Ended";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
