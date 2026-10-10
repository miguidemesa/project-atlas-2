"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Gavel, ShieldCheck } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { useAuth } from "@/lib/auth";
import { createOrder, makeOffer, maxRedeemable, payOrder as payOrderApi, placeBid, fetchMyRewards } from "@/lib/api";
import { payOutcome } from "@/lib/checkout";
import { formatPeso } from "@atlas/api";
import { cn } from "@/lib/cn";

interface Props {
  listingId: string;
  price: number;
  format: "fixed" | "auction";
  bidCount?: number;
  endsAt?: string;
}

export function BidBox({ listingId, price, format, bidCount, endsAt }: Props) {
  const [done, setDone] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState<"idle" | "address" | "paying">("idle");
  const [address, setAddress] = useState("");
  const [buyError, setBuyError] = useState("");
  const [pendingNote, setPendingNote] = useState(false);
  const [ordersHint, setOrdersHint] = useState(false);
  const busy = useRef(false);
  const [orderId, setOrderId] = useState<string | null>(null);
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

  // A bfcache Back can restore the page mid-checkout; don't strand the form.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      busy.current = false;
      setCheckoutStage((s) => (s === "paying" ? "address" : s));
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

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
    if (!user || busy.current) return;
    busy.current = true;
    setBuyError("");
    setOrdersHint(false);
    setCheckoutStage("paying");
    try {
      await runCheckout();
    } finally {
      busy.current = false;
    }
  }

  async function runCheckout() {
    let id = orderId;
    if (!id) {
      const created = await createOrder(listingId, address, authFetch);
      if (!created.ok) {
        setBuyError(created.error);
        setOrdersHint(created.status === 409);
        setCheckoutStage("idle");
        return;
      }
      id = created.order.id;
      setOrderId(id);
    }
    const paid = await payOrderApi(id, undefined, usePts, authFetch);
    // Only the server's answer says whether money moved (domain rule 11).
    switch (payOutcome(paid)) {
      case "redirect":
        window.location.href = paid.checkoutUrl!; // PayMongo hosted page; the form stays disabled until we leave
        return;
      case "paid":
        setDone(true);
        break;
      case "pending":
        setPendingNote(true);
        break;
      case "expired":
        setOrderId(null);
        setBuyError("This reservation ended. Start checkout again.");
        setCheckoutStage("idle");
        return;
      default:
        // The order stays reserved; the form stays open so the buyer can retry.
        setBuyError(`Payment didn’t go through${paid.error ? `: ${paid.error}` : "."} Your order is reserved, so you can try again or finish from Orders.`);
        setCheckoutStage("address");
        return;
    }
    setCheckoutStage("idle");
  }

  if (format === "auction") {
    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-faint">Current bid</p>
            <p className="font-display text-4xl text-accent">{formatPeso(price)}</p>
          </div>
          <div className="text-right">
            {endsAt && <Countdown endsAt={endsAt} />}
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
                <button key={s} type="button" onClick={() => quick(s)} className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-ink-dim transition-colors hover:border-accent hover:text-accent">
                  +{formatPeso(s)}
                </button>
              ))}
              <button type="button" onClick={() => quick("pct5")} className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-ink-dim transition-colors hover:border-accent hover:text-accent">
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
                className="w-full rounded-lg border border-line bg-elevated px-4 py-3 font-mono tabular-nums text-ink focus:border-accent focus:outline-none"
                aria-describedby="bid-help"
              />
              <button
                type="submit"
                disabled={Number(amount) <= price || bidBusy}
                className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold whitespace-nowrap text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
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
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-faint">Price</p>
        <p className="font-display text-4xl text-accent">{formatPeso(price)}</p>
      </div>

      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-confirmed/40 bg-confirmed/10 px-4 py-3 text-sm font-medium text-confirmed">
          <Check size={16} /> Paid — the seller will ship within 3 days.
        </p>
      ) : pendingNote ? (
        <p role="status" className="rounded-lg border border-line bg-elevated px-4 py-3 text-sm text-ink-dim">
          Payment pending — we haven’t had confirmation yet. Check Orders for the latest status.
        </p>
      ) : checkoutStage !== "idle" ? (
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
            className="w-full rounded-lg border border-line bg-base px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          {buyError && <p role="alert" className="mt-2 text-xs text-urgent">{buyError}</p>}
          {ptsBalance >= 100 && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-dim">
              <input type="checkbox" checked={usePts} onChange={(e) => setUsePts(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
              Use ⭐ points — save {formatPeso(maxRedeemable(ptsBalance, price))}
            </label>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={checkoutStage === "paying"} onClick={() => setCheckoutStage("idle")} className="rounded-lg border border-line px-4 py-2.5 text-sm text-ink-dim hover:text-ink disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={checkoutStage === "paying"} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50">
              {checkoutStage === "paying" ? "Processing…" : orderId ? "Try payment again" : "Confirm & pay"} {formatPeso(price - (usePts ? maxRedeemable(ptsBalance, price) : 0))}
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
          className="w-full rounded-lg bg-accent py-3.5 font-semibold text-on-accent shadow-card transition-all hover:bg-accent-hover active:scale-[0.99]"
        >
          Buy now
        </button>
      )}

      {buyError && checkoutStage === "idle" && offerStage !== "form" && (
        <p role="alert" className="text-xs text-urgent">
          {buyError}
          {ordersHint && (
            <> Check <Link href="/orders" className="underline">Orders</Link> for it.</>
          )}
        </p>
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
          className="text-xs font-medium text-ink-dim transition-colors hover:text-accent"
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
                      ? "border-accent text-accent"
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
              className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
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
              className="flex-1 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-base disabled:opacity-40"
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
        <ShieldCheck size={14} className="text-accent" /> Funds held in escrow until you confirm delivery.
      </p>
    </div>
  );
}
