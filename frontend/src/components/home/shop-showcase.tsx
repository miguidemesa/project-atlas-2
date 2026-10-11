import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { buttonGhost } from "@/components/ui/button-styles";
import { SwipeRow } from "@/components/ui/swipe-row";
import { cn } from "@/lib/cn";
import type { TopSeller } from "@atlas/api";

const FAN = ["-rotate-12 motion-safe:group-hover:-rotate-[18deg]", "z-10", "rotate-12 motion-safe:group-hover:rotate-[18deg]"];

/** Sellers as shop showcases: real 30-day sales, live listings, a rating only once reviews exist, and their newest cards fanned. */
export function ShopShowcase({ sellers, sub = "Sellers with the most paid orders, last 30 days" }: { sellers: TopSeller[]; sub?: string }) {
  if (sellers.length === 0) return null;
  return (
    <SwipeRow id="shops" title="Shops worth following" sub={sub} wide>
      {sellers.map((s) => (
        <li key={s.id} className="snap-start">
          <ShopTile seller={s} />
        </li>
      ))}
    </SwipeRow>
  );
}

function ShopTile({ seller }: { seller: TopSeller }) {
  const facts = [
    `${seller.sales} ${seller.sales === 1 ? "sale" : "sales"}, 30 days`,
    seller.ratingCount > 0 && seller.ratingAvg !== null ? `${seller.ratingAvg.toFixed(1)} from ${seller.ratingCount} reviews` : null,
    `${seller.liveListings} for sale`,
  ].filter((f): f is string => f !== null);
  return (
    <article className="group flex h-full flex-col gap-4 rounded-[16px] border border-line bg-elevated p-4">
      <header className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-avatar font-display text-sm text-ink">
          {seller.displayName.charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold text-ink">{seller.displayName}</span>
          {seller.verified && (
            <span className="inline-flex items-center gap-1 text-xs text-confirmed">
              <BadgeCheck size={14} strokeWidth={1.75} aria-hidden />
              Verified
            </span>
          )}
        </span>
      </header>
      {seller.listings.length > 0 && (
        <div aria-hidden className="relative flex h-[120px] items-end justify-center">
          {seller.listings.slice(0, FAN.length).map((l, i) => (
            <span
              key={l.id}
              className={cn(
                "relative -mx-3 aspect-[63/88] w-[72px] origin-bottom overflow-hidden rounded-md border border-well-line bg-well transition-transform duration-200 ease-out",
                FAN[i],
              )}
            >
              <CardImage listing={l} />
            </span>
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-1 text-[13px] text-ink-dim">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link href={`/sellers/${seller.id}`} className={cn(buttonGhost, "mt-auto min-h-11 w-full")}>
        Visit shop
      </Link>
    </article>
  );
}
