import Link from "next/link";
import { skinFor, skinVars } from "@/lib/categories";
import type { CategoryInfo } from "@/lib/types";

/** A game's door in its own skin: accent glow in the corner, dot pattern, name, live count, 5px colour band. */
export function GameCapsule({ category }: { category: CategoryInfo }) {
  const count = category.activeListings;
  const countText = count > 0 ? `${count} for sale` : "No listings yet";
  return (
    <Link
      href={`/c/${category.slug}`}
      aria-label={`${category.name}, ${count > 0 ? `${count} for sale` : "no listings yet"}`}
      style={skinVars(skinFor(category.slug, category.hue))}
      className="group relative flex min-h-[88px] flex-col justify-end overflow-hidden rounded-[16px] border border-[color:var(--skin-border)] bg-[color:var(--skin-ground)] p-4 pb-5 transition-[transform,box-shadow,border-color] duration-[220ms] ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_36px_-16px_color-mix(in_oklab,var(--skin-accent)_45%,transparent)] md:min-h-32"
    >
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--skin-accent)_26%,transparent),transparent)]" />
      {/* ponytail: one dot-grid pattern for every game; the per-game patterns (Pokémon dots, One Piece rope…) when art direction asks */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--skin-accent)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px]" />
      <span data-name className="t-door-phone relative line-clamp-2 text-[color:var(--skin-accent)] md:t-door">
        {category.name}
      </span>
      <span className="relative mt-1 text-[13px] text-[color:var(--skin-text)]">{countText}</span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[5px] bg-[color:var(--skin-accent)]" />
    </Link>
  );
}
