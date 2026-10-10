import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { formatPeso } from "@atlas/api";
import type { SetSummary } from "@atlas/api";

/** A game's sets with live counts and the lowest fixed price; each opens the marketplace scoped to it. */
export function HubSets({ id, sets, category, limit, viewAll }: { id: string; sets: SetSummary[]; category: string; limit?: number; viewAll?: string }) {
  if (sets.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id} action={viewAll ? { href: viewAll, label: "All sets" } : undefined}>Browse by set</SectionTitle>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sets.slice(0, limit ?? sets.length).map((s) => (
          <li key={s.name}>
            <Link
              href={`/browse?category=${encodeURIComponent(category)}&q=${encodeURIComponent(s.name)}`}
              className="flex min-h-16 flex-col justify-center rounded-[12px] border border-[color:var(--skin-line)] bg-[color:var(--skin-surface)] px-4 py-3 transition-colors hover:bg-[color:var(--skin-raised)]"
            >
              <span className="truncate text-[15px] font-semibold text-ink">{s.name}</span>
              <span className="text-xs text-[color:var(--skin-text)]">
                {s.listings} for sale{s.fromPrice !== null && ` · from ${formatPeso(s.fromPrice)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
