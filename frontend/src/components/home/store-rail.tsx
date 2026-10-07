import Link from "next/link";
import { GameLine } from "@/components/ui/game-line";
import { busiest } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { BUDGETS } from "@/lib/store-nav";
import type { CategoryInfo } from "@/lib/types";

const heading = "mb-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint";
const row = "flex h-9 items-center justify-between gap-2 rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-hover-wash hover:text-ink";

/** The web home's 220px rail: the busiest games with their dot and live count, then price brackets. Store sections live in the store bar, not here. */
export function StoreRail({ categories, className }: { categories: CategoryInfo[]; className?: string }) {
  const games = busiest(categories, 12);
  return (
    <aside className={cn("sticky top-[128px] self-start", className)}>
      {games.length > 0 && (
        <nav aria-label="Games">
          <p className={heading}>Games</p>
          <ul>
            {games.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className={row}>
                  <GameLine slug={c.slug} />
                  <span className="t-mono text-ink-faint">{c.activeListings}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/categories" className="mt-1 flex h-9 items-center px-3 text-sm font-semibold text-accent hover:text-accent-hover">
            All games
          </Link>
        </nav>
      )}
      <nav aria-label="Shop by budget" className={games.length > 0 ? "mt-6" : undefined}>
        <p className={heading}>Shop by budget</p>
        <ul>
          {BUDGETS.map((b) => (
            <li key={b.href}>
              <Link href={b.href} className={row}>
                {b.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
