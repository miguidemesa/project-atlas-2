"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { OfferActions } from "@/components/orders/offer-actions";
import { ReviewForm } from "@/components/orders/review-form";
import { useAuth } from "@/lib/auth";
import {
  acceptOffer,
  confirmDelivery,
  counterOffer,
  declineOffer,
  fetchMyOffers,
  fetchMyOrders,
  postReview,
  payOrder as payOrderApi,
  shipOrder,
  type Offer,
  type Order,
} from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";

const STATUS_META: Record<Order["status"], { label: string; cls: string }> = {
  pending_payment: { label: "Awaiting payment", cls: "bg-warn/10 text-warn" },
  paid_awaiting_shipment: { label: "Paid — packing", cls: "bg-fixed/10 text-fixed" },
  shipped: { label: "Shipped", cls: "bg-raised text-ink" },
  funds_released: { label: "Delivered ✓", cls: "bg-confirmed/10 text-confirmed" },
  disputed: { label: "In dispute", cls: "bg-urgent/10 text-urgent" },
  cancelled: { label: "Cancelled", cls: "bg-raised text-ink-faint" },
  refunded: { label: "Refunded", cls: "bg-raised text-ink-faint" },
};

export default function OrdersPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const { data: orders, isPending } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => fetchMyOrders(authFetch),
    enabled: Boolean(user),
  });

  const { data: offers } = useQuery({
    queryKey: ["offers", "mine"],
    queryFn: () => fetchMyOffers(authFetch),
    enabled: Boolean(user),
  });

  async function act(order: Order, action: "ship" | "confirm") {
    setBusyId(order.id);
    setError("");
    const result =
      action === "ship"
        ? await shipOrder(order.id, tracking[order.id] ?? "", authFetch)
        : await confirmDelivery(order.id, authFetch);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <Package size={32} className="text-gold" />
        <h1 className="mt-4 font-display text-3xl text-ink">Your orders</h1>
        <p className="mt-2 text-sm text-ink-dim">Sign in to track purchases and sales in one place.</p>
        <Link href="/login" className="mt-6 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base hover:bg-gold-dim">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-ink">Your orders</h1>
        <p className="mt-2 text-sm text-ink-dim">Purchases and sales, with escrow status at every step.</p>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-urgent/10 px-3.5 py-2.5 text-xs text-urgent">
          {error}
        </p>
      )}

      {offers && (offers.incoming.length > 0 || offers.outgoing.length > 0) && (
        <section className="mb-10" aria-labelledby="my-offers">
          <h2 id="my-offers" className="mb-4 font-display text-2xl text-ink">
            Offers
          </h2>
          <ul className="space-y-3">
            {[...offers.incoming, ...offers.outgoing].map((o) => (
              <li key={o.id} className="rounded-xl border border-line bg-elevated p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/listing/${o.listingId}`} className="font-medium text-ink hover:text-gold">
                    {o.listingTitle}
                  </Link>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      o.status === "pending"
                        ? "bg-warn/10 text-warn"
                        : o.status === "accepted"
                          ? "bg-confirmed/10 text-confirmed"
                          : "bg-raised text-ink-dim",
                    )}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-ink-faint">
                  {o.viewerRole === "buyer" ? "You offered" : "They offered"}{" "}
                  <span className="text-gold">{formatPeso(o.amount)}</span> · asking {formatPeso(o.listingPrice)}
                </p>

                {o.awaitingViewerResponse && o.status === "pending" && (
                  <OfferActions offer={o} onDone={() => void queryClient.invalidateQueries({ queryKey: ["offers"] })} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-elevated" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-hv p-14 text-center">
          <p className="font-display text-xl text-ink">No orders yet</p>
          <p className="mt-2 text-sm text-ink-dim">When you buy or sell, every step shows up here.</p>
          <Link href="/browse" className="mt-6 inline-block rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base hover:bg-gold-dim">
            Browse the market
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const meta = STATUS_META[o.status];
            return (
              <li key={o.id} className="rounded-xl border border-line bg-elevated p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/listing/${o.listingId}`} className="font-medium text-ink hover:text-gold">
                    {o.listingTitle}
                  </Link>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-ink-faint">
                  {o.role === "buyer" ? "You bought" : "You sold"} · {formatPeso(o.price)}
                  {o.trackingNumber ? ` · ${o.trackingNumber}` : ""}
                </p>

                {o.status === "pending_payment" && o.role === "buyer" && (
                  <PayNow orderId={o.id} hasAddress={Boolean(o.shippingAddress)} onPaid={() => void queryClient.invalidateQueries({ queryKey: ["orders"] })} />
                )}

                {o.status === "paid_awaiting_shipment" && o.role === "seller" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={tracking[o.id] ?? ""}
                      onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                      placeholder="Tracking number (optional)"
                      aria-label={`Tracking number for order ${o.id}`}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => act(o, "ship")}
                      className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-base hover:bg-gold-dim disabled:opacity-50"
                    >
                      Mark shipped
                    </button>
                  </div>
                )}

                {o.status === "shipped" && o.role === "buyer" && (
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => act(o, "confirm")}
                    className="mt-3 rounded-lg bg-confirmed px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Received — release payment
                  </button>
                )}

                {o.status === "funds_released" && !o.reviewed && (
                  <ReviewForm orderId={o.id} onDone={() => void queryClient.invalidateQueries({ queryKey: ["orders"] })} />
                )}
                {o.status === "funds_released" && o.reviewed && (
                  <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">✓ You reviewed this transaction.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PayNow({ orderId, hasAddress, onPaid }: { orderId: string; hasAddress: boolean; onPaid: () => void }) {
  const { authFetch } = useAuth();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const r = await payOrderApi(orderId, hasAddress ? undefined : address, authFetch);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Payment failed.");
      return;
    }
    if (r.checkoutUrl) {
      window.location.href = r.checkoutUrl;
      return;
    }
    onPaid();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      {!hasAddress && (
        <textarea
          required
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address for this order"
          className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-urgent">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy || (!hasAddress && address.trim().length < 20)}
        onClick={go}
        className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-base hover:bg-gold-dim disabled:opacity-40"
      >
        {busy ? "Redirecting…" : "Complete payment"}
      </button>
    </div>
  );
}
