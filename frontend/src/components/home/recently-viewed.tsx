"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getRecent, type RecentSnapshot } from "@/lib/recent";
import { formatPeso } from "@/lib/format";

/** "Pick up where you left off" rail — device-local, hidden when empty. */
export function RecentlyViewed() {
  const [items, setItems] = useState<RecentSnapshot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getRecent().slice(0, 6));
    setReady(true);
  }, []);

  if (!ready || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-8" aria-labelledby="recently-viewed">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="recently-viewed" className="font-display text-2xl text-ink">
          Pick up where you left off
        </h2>
        <span className="text-xs text-ink-faint">stored on your device</span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.map((r) => (
          <Link
            key={r.id}
            href={`/listing/${r.id}`}
            className="group flex w-64 shrink-0 items-center gap-3 rounded-xl border border-line bg-elevated p-2.5 shadow-card transition-colors hover:border-gold"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg">
              {r.imageUrl ? (
                <Image src={r.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-raised font-display text-xs text-ink-faint">
                  {r.player.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{r.title}</p>
              <p className="font-display text-base text-gold">{formatPeso(r.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
