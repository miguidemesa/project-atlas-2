"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getRecent, type RecentSnapshot } from "@/lib/recent";
import { formatPeso } from "@atlas/api";
import { SectionTitle } from "@/components/ui/section-title";

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
    <section aria-labelledby="recently-viewed">
      <SectionTitle id="recently-viewed">Pick up where you left off</SectionTitle>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
        {items.map((r) => (
          <li key={r.id} className="shrink-0">
            <Link
              href={`/listing/${r.id}`}
              className="flex w-64 items-center gap-3 rounded-[12px] border border-line bg-elevated p-2.5 transition-colors hover:border-line-hv"
            >
              <span className="relative aspect-[63/88] w-12 shrink-0 overflow-hidden rounded-md border border-well-line bg-well">
                {r.imageUrl ? (
                  <Image src={r.imageUrl} alt="" fill sizes="48px" className="object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-xs text-ink-faint">
                    {r.player.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                <span className="t-price block text-ink">{formatPeso(r.price)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
