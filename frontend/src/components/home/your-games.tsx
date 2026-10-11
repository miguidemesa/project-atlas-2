import Link from "next/link";
import { GameLine } from "@/components/ui/game-line";
import { cn } from "@/lib/cn";
import type { CategoryInfo } from "@atlas/api";

const chip = "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors";

/** The games the home is ordered by: the visitor's own (first one emphasised), or the busiest when we know nothing yet. */
export function YourGames({ games, personalized, total }: { games: CategoryInfo[]; personalized: boolean; total: number }) {
  if (games.length === 0) return null;
  return (
    <nav aria-label={personalized ? "Your games" : "Popular games"} className="flex min-w-0 items-center gap-3">
      <span className="shrink-0 font-display text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        {personalized ? "Your games" : "Popular games"}
      </span>
      <ul className="no-scrollbar -mr-4 flex min-w-0 gap-2 overflow-x-auto pr-4 md:mr-0 md:pr-0">
        {games.map((g, i) => {
          const top = personalized && i === 0;
          return (
            <li key={g.slug}>
              <Link
                href={`/c/${g.slug}`}
                data-top={top || undefined}
                className={cn(chip, top ? "border-line-strong bg-raised text-ink" : "border-line text-ink-soft hover:bg-hover-wash hover:text-ink")}
              >
                <GameLine slug={g.slug} />
                <span className="t-mono text-xs text-ink-faint">{g.activeListings}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/categories" className={cn(chip, "border-transparent font-semibold text-accent hover:text-accent-hover")}>
            All {total} games
          </Link>
        </li>
      </ul>
    </nav>
  );
}
