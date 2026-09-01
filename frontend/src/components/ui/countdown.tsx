"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(s / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => +new Date(endsAt) - Date.now());

  useEffect(() => {
    const t = setInterval(() => setRemaining(+new Date(endsAt) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const { h, m, s } = parts(remaining);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tone = remaining < 10 * 60_000 ? "text-urgent" : remaining < 60 * 60_000 ? "text-warn" : "text-ink";

  if (remaining <= 0) return <span className="font-mono text-sm text-ink-faint">ended</span>;

  return (
    <span className={`font-mono text-sm tabular-nums ${tone}`} suppressHydrationWarning>
      {h > 0 ? `${h}:` : ""}
      {pad(m)}:{pad(s)}
      <span className="ml-1.5 text-xs text-ink-dim">left</span>
    </span>
  );
}
