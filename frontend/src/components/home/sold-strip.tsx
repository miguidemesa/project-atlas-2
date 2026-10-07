import Image from "next/image";
import Link from "next/link";
import { formatPeso, timeAgo } from "@/lib/format";
import type { RecentSale } from "@/lib/types";

/** Real paid orders, newest first. Hidden until there is one. */
export function SoldStrip({ sales }: { sales: RecentSale[] }) {
  if (sales.length === 0) return null;

  return (
    <section className="border-y border-line bg-elevated/50 py-14" aria-labelledby="recently-sold">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="recently-sold" className="font-display text-2xl text-ink sm:text-3xl">
            Recently sold
          </h2>
          <p className="text-xs text-ink-faint">Paid orders on Atlas</p>
        </div>
        <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
          {sales.map((s) => (
            <Link
              key={s.listingId}
              href={`/listing/${s.listingId}`}
              className="group w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-elevated shadow-card transition-colors hover:border-line-hv sm:w-52"
            >
              <div className="relative aspect-[3/4] bg-base">
                {s.imageUrl ? (
                  <Image src={s.imageUrl} alt="" fill sizes="208px" className="object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center font-display text-2xl text-ink-faint">
                    {s.title.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-base/70 py-1 font-display text-sm tracking-wider text-gold backdrop-blur-sm">
                  SOLD
                </span>
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                <p className="font-display text-lg leading-none text-gold">{formatPeso(s.price)}</p>
                <p className="text-[11px] text-ink-faint">Sold {timeAgo(s.soldAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
