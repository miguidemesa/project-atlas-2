"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { postReview } from "@/lib/api";
import { cn } from "@/lib/cn";

export function ReviewForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { authFetch } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await postReview(orderId, rating, content, authFetch);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Review failed.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-line pt-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={cn(
              "text-lg leading-none transition-transform",
              n <= rating ? "scale-110 text-gold" : "text-line-hv hover:text-gold-dim",
            )}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-xs text-ink-faint">How was the transaction?</span>
      </div>
      <textarea
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        placeholder="Optional — how did it go?"
        className="w-full rounded-lg border border-line bg-base px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-xs text-urgent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !rating}
        className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-base hover:bg-gold-dim disabled:opacity-40"
      >
        {busy ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
