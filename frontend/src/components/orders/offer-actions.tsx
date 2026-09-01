"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { acceptOffer, counterOffer, declineOffer, type Offer } from "@/lib/api";
import { formatPeso } from "@/lib/format";

export function OfferActions({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const { authFetch } = useAuth();
  const [mode, setMode] = useState<"idle" | "counter">("idle");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function run(action: "accept" | "counter" | "decline") {
    setError("");
    let result: { ok: boolean; error?: string } = { ok: true };
    if (action === "accept") result = await acceptOffer(offer.id, authFetch);
    else if (action === "counter") result = await counterOffer(offer.id, Number(amount), authFetch);
    else await declineOffer(offer.id, authFetch);
    if (!result.ok) {
      setError(result.error ?? "Failed.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      {mode === "counter" && (
        <input
          autoFocus
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Your counter amount in ₱"
          aria-label="Counter amount in pesos"
          className="w-full max-w-xs rounded-lg border border-line bg-base px-3 py-2 font-mono text-sm tabular-nums text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-urgent">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run("accept")}
          className="rounded-lg bg-confirmed px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Accept — deal at {formatPeso(offer.amount)}
        </button>
        {mode === "idle" ? (
          <button
            type="button"
            onClick={() => setMode("counter")}
            className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-gold hover:text-gold"
          >
            Counter
          </button>
        ) : (
          <button
            type="button"
            disabled={!Number(amount)}
            onClick={() => void run("counter")}
            className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-base hover:bg-gold-dim disabled:opacity-40"
          >
            Send counter
          </button>
        )}
        <button
          type="button"
          onClick={() => void run("decline")}
          className="rounded-lg px-4 py-2 text-xs font-medium text-ink-dim transition-colors hover:text-urgent"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
