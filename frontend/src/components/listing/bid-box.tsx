"use client";

import { useState } from "react";
import { Check, Gavel, Heart, ShieldCheck } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { formatPeso, pctChange } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  price: number;
  previousPrice?: number;
  format: "fixed" | "auction";
  bidCount?: number;
  endsAt?: string;
  watchers: number;
}

export function BidBox({ price, previousPrice, format, bidCount, endsAt, watchers }: Props) {
  const [watching, setWatching] = useState(false);
  const [done, setDone] = useState(false);
  const [amount, setAmount] = useState(() => String(Math.ceil((price + Math.max(500, price * 0.02)) / 100) * 100));

  const change = pctChange(price, previousPrice ?? 0);

  function quick(step: number | "pct5") {
    const base = Number(amount) || price;
    const next = step === "pct5" ? Math.round(base * 1.05) : base + step;
    setAmount(String(Math.ceil(next / 100) * 100));
  }

  if (format === "auction") {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-faint">Current bid</p>
            <p className="font-display text-4xl text-gold">{formatPeso(price)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-ink-dim">{bidCount} bids</p>
            <Countdown endsAt={endsAt!} />
          </div>
        </div>

        {previousPrice && Math.abs(change) >= 1 && (
          <p className={cn("font-mono text-xs", change > 0 ? "text-confirmed" : "text-urgent")}>
            {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs last sale
          </p>
        )}

        {done ? (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-confirmed/40 bg-confirmed/10 px-4 py-3 text-sm font-medium text-confirmed">
            <Check size={16} /> Bid placed — you&apos;re the highest bidder.
          </p>
        ) : (
          <>
            <div className="flex gap-2" aria-label="Quick bid increments">
              {[500, 1000].map((s) => (
                <button key={s} type="button" onClick={() => quick(s)} className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-ink-dim transition-colors hover:border-gold hover:text-gold">
                  +{formatPeso(s)}
                </button>
              ))}
              <button type="button" onClick={() => quick("pct5")} className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-ink-dim transition-colors hover:border-gold hover:text-gold">
                +5%
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (Number(amount) > price) setDone(true);
              }}
              className="flex gap-2"
            >
              <label htmlFor="bid-amount" className="sr-only">Your bid in pesos</label>
              <input
                id="bid-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-lg border border-line bg-elevated px-4 py-3 font-mono tabular-nums text-ink focus:border-gold focus:outline-none"
                aria-describedby="bid-help"
              />
              <button
                type="submit"
                disabled={Number(amount) <= price}
                className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold whitespace-nowrap text-ink transition-colors hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Gavel size={16} />
                Place bid
              </button>
            </form>
            <p id="bid-help" className="text-xs text-ink-faint">
              Bids are binding. Minimum increment ₱500 — escrow releases only after delivery is confirmed.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-faint">Price</p>
          <p className="font-display text-4xl text-gold">{formatPeso(price)}</p>
        </div>
        <button
          type="button"
          onClick={() => setWatching(!watching)}
          aria-pressed={watching}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            watching ? "border-gold text-gold" : "border-line text-ink-dim hover:border-line-hv hover:text-ink",
          )}
        >
          <Heart size={14} className={cn(watching && "fill-gold")} />
          {watching ? "Watching" : `Watch · ${watchers}`}
        </button>
      </div>

      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-confirmed/40 bg-confirmed/10 px-4 py-3 text-sm font-medium text-confirmed">
          <Check size={16} /> Reserved — check your email for payment steps.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setDone(true)}
          className="w-full rounded-lg bg-gold py-3.5 font-semibold text-ink shadow-card transition-all hover:bg-gold-dim active:scale-[0.99]"
        >
          Buy now
        </button>
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-faint">
        <ShieldCheck size={14} className="text-gold" /> Funds held in escrow until you confirm delivery.
      </p>
    </div>
  );
}
