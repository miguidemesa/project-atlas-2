import type { Metadata } from "next";
import { BrowseClient } from "@/components/browse/browse-client";
import { loadCategories } from "@/lib/api";
import { browseQuery, type BrowseParams } from "@/lib/browse-query";
import { categoryName } from "@/lib/categories";

export const metadata: Metadata = { title: "Browse" };
export const dynamic = "force-dynamic";

export default async function BrowsePage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const [sp, categories] = await Promise.all([searchParams, loadCategories()]);
  const initial = browseQuery(sp, categories);
  const heading = sp.player
    ? `${sp.player} cards`
    : (categoryName(categories, initial.category) ?? (initial.format === "auction" ? "Live auctions" : "Browse the market"));

  return (
    <div>
      <header className="border-b border-line bg-elevated/50 px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{heading}</h1>
          <p className="mt-2 text-sm text-ink-dim">Every price in Philippine pesos. Real listings from real sellers.</p>
        </div>
      </header>
      <BrowseClient key={JSON.stringify(initial)} initial={initial} categories={categories} />
    </div>
  );
}
