import Image from "next/image";
import Link from "next/link";
import { GameLine } from "@/components/ui/game-line";
import { SectionTitle } from "@/components/ui/section-title";
import { formatPeso, timeAgo } from "@/lib/format";
import type { RecentSale } from "@/lib/types";

/** Real paid orders, newest first. Hidden until there is one. */
export function SoldStrip({ sales, id = "recently-sold" }: { sales: RecentSale[]; id?: string }) {
  if (sales.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id}>Recently sold</SectionTitle>
      <ul className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        {sales.map((s) => (
          <li key={s.listingId} className="w-40 shrink-0 snap-start">
            <Link href={`/listing/${s.listingId}`} className="flex flex-col gap-2">
              <span className="relative aspect-[63/88] overflow-hidden rounded-[12px] border border-well-line bg-well">
                {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="160px" className="object-contain" />}
              </span>
              <span className="truncate text-sm font-semibold text-ink">{s.title}</span>
              <GameLine slug={s.category} className="text-xs text-ink-dim" />
              <span className="flex items-baseline justify-between gap-2">
                <span className="t-mono text-ink">{formatPeso(s.price)}</span>
                <span className="text-xs text-ink-faint">{timeAgo(s.soldAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
