"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Gavel, Heart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createOrder, makeOffer, maxRedeemable, payOrder as payOrderApi, placeBid, fetchMyRewards } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  listingId: string;
  price: number;
  previousPrice?: number;
  format: "fixed" | "auction";
  bidCount?: number;
  endsAt?: string;
  watchers: number;
}

export function BidBox({ listingId, price, previousPrice, format, bidCount, endsAt: _endsAt, watchers }: Props) {
  const [watching, setWatching] = useState(false);
  const [done, setDone] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState<"idle" | "address" | "paying">("idle");
  const [address, setAddress] = useState("");
  const [buyError, setBuyError] = useState("");
  const [offerStage, setOfferStage] = useState<"idle" | "form" | "sent">("idle");
  const [offerAmount, setOfferAmount] = useState(() => String(Math.round((price * 0.9) / 100) * 100));
  const [liveBidCount, setLiveBidCount] = useState(bidCount ?? 0);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [bidBusy, setBidBusy] = useState(false);
  const [amount, setAmount] = useState(() =>
    format === "auction" ? String((price ?? 0) + 500) : "",
  );
  const [usePts, setUsePts] = useState(false);
  const [ptsBalance, setPtsBalance] = useState(0);
  const { user, authFetch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || format !== "fixed") return;
    let live = true;
    fetchMyRewards(authFetch).then((r) => { if (live) setPtsBalance(r.balance); });
    return () => { live = false; };
  }, [user, format, authFetch]);

  function quick(step: number | "pct5") {
    const base = Number(amount) || price;
    const next = step === "pct5" ? Math.round(base * 1.05) : base + step;
    setAmount(String(Math.ceil(next / 100) * 100));
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setBidBusy(true);
    setBuyError("");
    const result = await placeBid(listingId, Number(amount), authFetch);
    setBidBusy(false);
    if (!result.ok) {
      setBuyError(result.error);
      return;
    }
    setLiveBidCount(result.result.totalBids);
    setBidSuccess(true);
    router.refresh();
  }

  async function submitBuy(e: React.FormEvent) {
    e.preventDefault();
    setBuyError("");
    if (!user) return;
    setCheckoutStage("paying");
    const created = await createOrder(listingId, address, authFetch);
    if (!created.ok) {
      setBuyError(created.error);
      setCheckoutStage("idle");
      return;
    }
    const paid = await payOrderApi(created.order.id, undefined, usePts, authFetch);
    if (!paid.ok) {
      setBuyError(`Order reserved but payment failed: ${paid.error}`);
      setDone(true);
      setCheckoutStage("idle");
      return;
    }
    if (paid.checkoutUrl) {
      window.location.href = paid.checkoutUrl; // PayMongo hosted page
      return;
    }
    setDone(true);
    setCheckoutStage("idle");
  }

  const change = previousPrice ? ((price - previousPrice) / previousPrice) * 100 : 0;

  if (format === "auction") {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-faint">Current bid</p>
            <p className="font-display text-4xl text-gold">{formatPeso(price)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-ink-dim">{liveBidCount} bids</p>
          </div>
        </div>

        {done || bidSuccess ? (
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

            <form onSubmit={submitBid} className="flex gap-2">
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
                disabled={Number(amount) <= price || bidBusy}
                className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold whitespace-nowrap text-base transition-colors hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Gavel size={16} />
                {bidBusy ? "Placing…" : "Place bid"}
              </button>
            </form>
            {buyError && <p role="alert" className="text-xs text-urgent">{buyError}</p>}
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

      {previousPrice && Math.abs(change) >= 1 && (
        <p className={cn("font-mono text-xs", change > 0 ? "text-confirmed" : "text-urgent")}>
          {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs last sale
        </p>
      )}

      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-confirmed/40 bg-confirmed/10 px-4 py-3 text-sm font-medium text-confirmed">
          <Check size={16} /> Paid — the seller will ship within 3 days.
        </p>
      ) : checkoutStage === "address" ? (
        <form
          onSubmit={submitBuy}
        >
          <label htmlFor="ship-address" className="mb-1.5 block text-xs font-medium text-ink-dim">
            Delivery address
          </label>
          <textarea
            id="ship-address"
            required
            minLength={20}
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, barangay, city, province, ZIP"
            className="w-full rounded-lg border border-line bg-base px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
          {buyError && <p role="alert" className="mt-2 text-xs text-urgent">{buyError}</p>}
          {ptsBalance >= 100 && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-dim">
              <input type="checkbox" checked={usePts} onChange={(e) => setUsePts(e.target.checked)} className="h-3.5 w-3.5 accent-[#b08d3e]" />
              Use ⭐ points — save {formatPeso(maxRedeemable(ptsBalance, price))}
            </label>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setCheckoutStage("idle")} className="rounded-lg border border-line px-4 py-2.5 text-sm text-ink-dim hover:text-ink">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-gold py-2.5 text-sm font-semibold text-base hover:bg-gold-dim disabled:opacity-50">
              Confirm & pay {formatPeso(price)}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!user) {
              router.push("/login");
              return;
            }
            setCheckoutStage("address");
          }}
          className="w-full rounded-lg bg-gold py-3.5 font-semibold text-base shadow-card transition-all hover:bg-gold-dim active:scale-[0.99]"
        >
          Buy now
        </button>
      )}

      {format === "fixed" && !done && offerStage !== "sent" && checkoutStage === "idle" && (
        <button
          type="button"
          onClick={() => {
            if (!user) {
              router.push("/login");
              return;
            }
            setOfferStage(offerStage === "form" ? "idle" : "form");
          }}
          className="text-xs font-medium text-ink-dim transition-colors hover:text-gold"
        >
          or make an offer
        </button>
      )}

      {format === "fixed" && offerStage === "form" && (
        <div className="space-y-2.5 rounded-lg border border-line p-3.5">
          <div className="flex gap-2" aria-label="Suggested offer amounts">
            {[0.9, 0.95].map((r) => {
              const v = Math.round((price * r) / 100) * 100;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOfferAmount(String(v))}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
                    Number(offerAmount) === v
                      ? "border-gold text-gold"
                      : "border-line text-ink-dim hover:border-line-hv hover:text-ink",
                  )}
                >
                  ₱{v.toLocaleString("en-PH")}
                </button>
              );
            })}
            <input
              type="number"
              min={1}
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value.replace(/[^0-9]/g, ""))}
              aria-label="Your offer in pesos"
              className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-gold focus:outline-none"
            />
          </div>
          {buyError && <p role="alert" className="text-xs text-urgent">{buyError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOfferStage("idle")} className="rounded-lg border border-line px-4 py-2 text-xs text-ink-dim hover:text-ink">
              Cancel
            </button>
            <button
              type="button"
              disabled={!Number(offerAmount)}
              onClick={async () => {
                setBuyError("");
                const result = await makeOffer(listingId, Number(offerAmount), authFetch);
                if (!result.ok) {
                  setBuyError(result.error);
                  return;
                }
                setOfferStage("sent");
              }}
              className="flex-1 rounded-lg border border-gold px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-base disabled:opacity-40"
            >
              Send offer
            </button>
          </div>
        </div>
      )}

      {format === "fixed" && offerStage === "sent" && (
        <p role="status" className="rounded-lg bg-fixed/10 px-3.5 py-2.5 text-xs text-fixed">
          Offer sent — the seller has 48 hours to respond. Track it under Orders → Offers.
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-faint">
        <ShieldCheck size={14} className="text-gold" /> Funds held in escrow until you confirm delivery.
      </p>
    </div>
  );
}
