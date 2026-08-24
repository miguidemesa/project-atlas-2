import type { Metadata } from "next";
import { BrowseClient } from "@/components/browse/browse-client";
import type { BrowseFilters } from "@/lib/api";

export const metadata: Metadata = { title: "Browse" };

interface Params {
  category?: string;
  format?: string;
  type?: string;
  graded?: string;
  maxPrice?: string;
  sort?: string;
  q?: string;
  player?: string;
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const initial: BrowseFilters & { q?: string } = {
    category: (["nba", "pokemon", "one_piece", "disney"] as const).includes(sp.category as never) ? (sp.category as never) : undefined,
    format: sp.format === "fixed" || sp.format === "auction" ? sp.format : undefined,
    type: (["single_card", "lot", "hobby_box", "accessory"] as const).includes(sp.type as never) ? (sp.type as never) : undefined,
    graded: sp.graded === "true",
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    sort: (["newest", "price_asc", "price_desc", "ending"] as const).includes(sp.sort as never) ? (sp.sort as never) : "newest",
    q: sp.q,
    player: sp.player,
  };

  return (
    <div>
      <header className="border-b border-line bg-elevated/50 px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            {sp.player
              ? `${sp.player} cards`
              : initial.category === "pokemon"
                ? "Pokémon"
                : initial.category === "one_piece"
                  ? "One Piece"
                  : initial.category === "disney"
                    ? "Disney & Lorcana"
                    : initial.format === "auction"
                      ? "Live auctions"
                      : "Browse the market"}
          </h1>
          <p className="mt-2 text-sm text-ink-dim">Every price in Philippine pesos. Every seller rated by real buyers.</p>
        </div>
      </header>
      <BrowseClient initial={initial} />
    </div>
  );
}
