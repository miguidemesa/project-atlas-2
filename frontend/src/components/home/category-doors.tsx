import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { skinFor, skinVars } from "@/lib/categories";
import type { CategoryInfo } from "@/lib/types";

/** "Shop by game" tiles: each one previews its hub's skin. */
export function CategoryDoors({ categories }: { categories: CategoryInfo[] }) {
  return (
    <nav aria-label="Shop by game" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/browse?category=${c.slug}`}
          aria-label={`${c.name}, ${c.activeListings} for sale`}
          style={skinVars(skinFor(c.slug, c.hue))}
          className="group relative flex min-h-11 h-[110px] flex-col justify-between overflow-hidden rounded-xl border border-[color:var(--skin-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold bg-[color:var(--skin-ground)] p-4 transition-transform duration-200 ease-out hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[color:var(--skin-accent)]">
            <span aria-hidden className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[color:var(--skin-accent)]" />
            {c.name}
          </span>
          <span className="flex items-center justify-between text-[13px] text-[color:var(--skin-text)]">
            <span className="tabular-nums">{c.activeListings.toLocaleString()} for sale</span>
            <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </span>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[5px] bg-[color:var(--skin-accent)]" />
        </Link>
      ))}
    </nav>
  );
}
