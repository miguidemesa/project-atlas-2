"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CardImage } from "@/components/cards/card-image";
import { fetchRecentlySold } from "@/lib/api";
import { formatPeso, timeAgo } from "@/lib/format";
import type { Listing } from "@/lib/types";

export function SoldStrip() {
  const { data } = useQuery({
    queryKey: ["sold", "recent"],
    queryFn: fetchRecentlySold,
    staleTime: 120_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="border-y border-line bg-elevated/50 py-14" aria-labelledby="recently-sold">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="recently-sold" className="font-display text-2xl text-ink sm:text-3xl">
            Recently sold
          </h2>
          <p className="text-xs text-ink-faint">Real deliveries, tracked door-to-door</p>
        </div>
        <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
          {data.map((l) => (
            <Link
              key={l.id}
              href={`/listing/${l.id}`}
              className="group w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-elevated shadow-card transition-colors hover:border-line-hv sm:w-52"
            >
              <div className="relative aspect-[3/4] bg-base">
                <CardImage listing={l as unknown as Listing} />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-base/70 py-1 font-display text-sm tracking-wider text-gold backdrop-blur-sm">
                  SOLD
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-ink">{l.player}</p>
                <p className="font-display text-lg leading-none text-gold">{formatPeso(l.price)}</p>
                <p className="text-[11px] text-ink-faint">Sold {timeAgo(l.soldAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
