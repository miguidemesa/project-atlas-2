"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { ListingCard } from "@/components/cards/listing-card";
import { fetchFeed, parseSearchQuery, type BrowseFilters } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { recordAffinityEvent } from "@/lib/affinity";
import type { Category, Listing } from "@/lib/types";
import { cn } from "@/lib/cn";

const CATEGORY_LABELS: Record<string, string> = {
  nba: "NBA",
  pokemon: "Pokémon",
  one_piece: "One Piece",
  disney: "Disney & Lorcana",
};

const SORTS = [
  ["newest", "Newest"],
  ["price_asc", "Price ↑"],
  ["price_desc", "Price ↓"],
  ["ending", "Ending soon"],
] as const;

const TYPES = [
  ["", "All types"],
  ["single_card", "Single cards"],
  ["lot", "Lots"],
  ["hobby_box", "Sealed"],
  ["accessory", "Gear"],
] as const;

export function BrowseClient({ initial }: { initial: BrowseFilters & { q?: string } }) {
  const [category, setCategory] = useState<BrowseFilters["category"]>(initial.category);
  const [format, setFormat] = useState<BrowseFilters["format"]>(initial.format);
  const [type, setType] = useState(initial.type ?? "");
  const [graded, setGraded] = useState(Boolean(initial.graded));
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ? String(initial.maxPrice) : "");
  const [sort, setSort] = useState<BrowseFilters["sort"]>(initial.sort ?? "newest");
  const [sheetOpen, setSheetOpen] = useState(false);

  const [aiApplied, setAiApplied] = useState(false);
  const [aiChips, setAiChips] = useState<string[]>([]);

  // NL search: interpret free-text q into structured filters once per mount
  useEffect(() => {
    const q = initial.q?.trim();
    if (!q || aiApplied) return;
    let cancelled = false;
    parseSearchQuery(q).then((parsed) => {
      if (cancelled || !parsed) return;
      const chips: string[] = [];
      if (parsed.category && !category) {
        setCategory(parsed.category as BrowseFilters["category"]);
        chips.push(CATEGORY_LABELS[parsed.category] ?? parsed.category);
      }
      if (parsed.format && !format) setFormat(parsed.format);
      if (parsed.graded && !graded) { setGraded(true); chips.push("Graded"); }
      if (parsed.maxPrice && !maxPrice) {
        setMaxPrice(String(parsed.maxPrice));
        chips.push(`under ₱${parsed.maxPrice.toLocaleString("en-PH")}`);
      }
      setAiApplied(true);
      if (chips.length) setAiChips(chips);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiApplied, initial.q]);

  const filters: BrowseFilters = {
    category,
    format,
    type: (type || undefined) as BrowseFilters["type"],
    graded: graded || undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort,
    player: initial.player,
  };

  const { data, isPending } = useQuery({
    queryKey: ["feed", filters],
    queryFn: () => fetchFeed(filters),
  });

  let results = data ?? [];
  if (initial.q) {
    const q = initial.q.toLowerCase();
    results = results.filter(
      (l) => l.title.toLowerCase().includes(q) || l.player.toLowerCase().includes(q) || l.set.toLowerCase().includes(q),
    );
  }

  const activeCount = [format !== undefined && "format", type, graded && "graded", maxPrice].filter(Boolean).length;

  const CATEGORY_TABS = [
    ["", "All"],
    ["nba", "NBA"],
    ["pokemon", "Pokémon"],
    ["one_piece", "One Piece"],
    ["disney", "Disney"],
  ] as const;

  const controls = (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Format</legend>
        <div className="flex rounded-lg border border-line p-0.5" role="group">
          {([["", "All"], ["fixed", "Buy now"], ["auction", "Auctions"]] as const).map(([v, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={format === (v || undefined)}
              onClick={() => setFormat((v || undefined) as BrowseFilters["format"])}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                format === (v || undefined) ? "bg-gold text-ink" : "text-ink-dim hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="type" className="mb-2 block text-sm font-semibold text-ink">Card type</label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as Listing["type"] | "")}
          className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
        >
          {TYPES.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={graded}
          onChange={(e) => setGraded(e.target.checked)}
          className="h-4 w-4 accent-[#b08d3e]"
        />
        Graded slabs only
      </label>

      <div>
        <label htmlFor="maxPrice" className="mb-2 block text-sm font-semibold text-ink">Max price (₱)</label>
        <input
          id="maxPrice"
          type="number"
          min="0"
          placeholder="Any"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full rounded-lg border border-line bg-elevated px-3 py-2 font-mono text-sm tabular-nums text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block" aria-label="Filters">
        {controls}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={category === (v || undefined)}
              onClick={() => {
                setCategory((v || undefined) as BrowseFilters["category"]);
                if (v) recordAffinityEvent(v as Category, "browse");
              }}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                category === (v || undefined)
                  ? "border-gold bg-gold font-semibold text-ink"
                  : "border-line bg-elevated text-ink-dim hover:border-line-hv hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          {aiChips.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gold" title="Parsed from your search using AI">
              <Sparkles size={12} />
              {aiChips.map((c) => (
                <span key={c} className="rounded border border-gold/40 px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-ink-dim" aria-live="polite">
            <span className="font-mono tabular-nums text-ink">{results.length}</span> result{results.length === 1 ? "" : "s"}
            {initial.q && <> for “{initial.q}”</>}
            {initial.player && <> for {initial.player}</>}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink lg:hidden"
            >
              <SlidersHorizontal size={14} />
              Filters{activeCount > 0 && <span className="rounded-full bg-gold px-1.5 text-[10px] text-ink">{activeCount}</span>}
            </button>
            <select
              aria-label="Sort results"
              value={sort}
              onChange={(e) => setSort(e.target.value as BrowseFilters["sort"])}
              className="rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-ink focus:border-gold focus:outline-none"
            >
              {SORTS.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {isPending ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/5.4] animate-pulse rounded-xl bg-elevated" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-hv py-20 text-center">
            <p className="font-display text-xl text-ink">No cards found</p>
            <p className="mt-2 text-sm text-ink-dim">Try widening your filters or searching a different player.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/60" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-base p-6 pb-10 shadow-lifted">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-lg text-ink">Filters</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="text-ink-dim hover:text-ink">
                <X size={20} />
              </button>
            </div>
            {controls}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full rounded-lg bg-gold py-3 text-sm font-semibold text-ink hover:bg-gold-dim"
            >
              Show {results.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
