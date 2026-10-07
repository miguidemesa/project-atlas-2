import Link from "next/link";
import { GameLine } from "@/components/ui/game-line";
import { busiest } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { STORE_LINKS } from "@/lib/store-nav";
import type { CategoryInfo } from "@/lib/types";

const heading = "mb-2 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint";
const row = "flex h-9 items-center justify-between gap-2 rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-hover-wash hover:text-ink";

/** The web home's 220px rail: store sections, then the busiest games with their dot and live count. */
export function StoreRail({ categories, className }: { categories: CategoryInfo[]; className?: string }) {
  const games = busiest(categories, 12);
  return (
    <aside className={cn("sticky top-[128px] self-start", className)}>
      <nav aria-label="Store sections">
        <p className={heading}>Browse</p>
        <ul>
          {STORE_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={row}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {games.length > 0 && (
        <nav aria-label="Games" className="mt-6">
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
    </aside>
  );
}
