"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ListingCard } from "@/components/cards/listing-card";
import { loadFeed, nextPage, parseSearchQuery, type ListingQuery } from "@/lib/api";
import { recordAffinityEvent } from "@/lib/affinity";
import { busiest, categoryName } from "@/lib/categories";
import { LANGUAGE_OPTIONS } from "@/lib/format";
import type { CategoryInfo, ListingType } from "@/lib/types";
import { cn } from "@/lib/cn";

const SORTS = [
  ["newest", "Newest"],
  ["popular", "Most viewed"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["ending", "Ending soon"],
] as const;

const TYPES = [
  ["", "All types"],
  ["single_card", "Single cards"],
  ["lot", "Lots"],
  ["hobby_box", "Sealed"],
  ["accessory", "Supplies"],
] as const;

const PAGE_SIZE = 24;
const PRICE_DEBOUNCE_MS = 300;

/** The value, but only after it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

const focusCls = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const fieldCls = cn(
  "min-h-11 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent",
  focusCls,
);

export function BrowseClient({ initial, categories }: { initial: ListingQuery; categories: CategoryInfo[] }) {
  // the controls render twice (aside + mobile sheet), so each copy gets its own id prefix
  const asideId = useId();
  const sheetId = useId();
  const [category, setCategory] = useState(initial.category);
  const [format, setFormat] = useState(initial.format);
  const [type, setType] = useState<ListingType | "">(initial.type ?? "");
  const [graded, setGraded] = useState(Boolean(initial.graded));
  const [language, setLanguage] = useState(initial.language ?? "");
  const [minPrice, setMinPrice] = useState(initial.minPrice ? String(initial.minPrice) : "");
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ? String(initial.maxPrice) : "");
  const [sort, setSort] = useState<NonNullable<ListingQuery["sort"]>>(initial.sort ?? "newest");
  const [q, setQ] = useState(initial.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiChips, setAiChips] = useState<string[]>([]);
  // a free-text phrase is held back until the natural-language parse has settled
  const [parseSettled, setParseSettled] = useState(!initial.q);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const debouncedMin = useDebounced(minPrice, PRICE_DEBOUNCE_MS);
  const debouncedMax = useDebounced(maxPrice, PRICE_DEBOUNCE_MS);

  // Free text: when the phrase parses into filters ("graded wemby under 30k"), apply them
  // and stop matching the raw phrase as text; otherwise the API searches the text.
  useEffect(() => {
    const phrase = initial.q;
    if (!phrase) return;
    let cancelled = false;
    parseSearchQuery(phrase).then((parsed) => {
      if (cancelled) return;
      setParseSettled(true);
      if (!parsed) return; // parse failed: the plain text goes to the API as q
      const chips: string[] = [];
      if (parsed.category && !initial.category && categories.some((c) => c.slug === parsed.category)) {
        setCategory(parsed.category);
        chips.push(categoryName(categories, parsed.category) ?? parsed.category);
      }
      if (parsed.format && !initial.format) setFormat(parsed.format);
      if (parsed.graded && !initial.graded) {
        setGraded(true);
        chips.push("Graded");
      }
      if (parsed.maxPrice && !initial.maxPrice) {
        setMaxPrice(String(parsed.maxPrice));
        chips.push(`under ₱${parsed.maxPrice.toLocaleString("en-PH")}`);
      }
      if (chips.length > 0) {
        setAiChips(chips);
        setQ(undefined);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initial, categories]);

  const query: ListingQuery = {
    category,
    format,
    type: type || undefined,
    graded: graded || undefined,
    language: language || undefined,
    minPrice: Number(debouncedMin) > 0 ? Number(debouncedMin) : undefined,
    maxPrice: Number(debouncedMax) > 0 ? Number(debouncedMax) : undefined,
    sort,
    q,
    player: initial.player,
    pageSize: PAGE_SIZE,
  };

  const feed = useInfiniteQuery({
    queryKey: ["feed", query],
    queryFn: ({ pageParam }) => loadFeed({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: parseSettled,
  });

  // a new listing can push an item onto the next page too; keep the first copy
  const results = [...new Map((feed.data?.pages.flatMap((p) => p.items) ?? []).map((l) => [l.id, l] as const)).values()];
  const total = feed.data?.pages[0]?.total ?? 0;
  const activeCount = [format, type, graded, language, minPrice, maxPrice].filter(Boolean).length;

  // the busiest games as chips, plus the selected one even when it has no listings yet
  const chips = useMemo(() => {
    const top = busiest(categories, 12);
    const selected = categories.find((c) => c.slug === category);
    return selected && !top.includes(selected) ? [...top, selected] : top;
  }, [categories, category]);

  // sheet: Escape closes, focus moves in on open and back to the trigger on close
  useEffect(() => {
    if (!sheetOpen) return;
    const trigger = triggerRef.current;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [sheetOpen]);

  const controls = (id: string) => (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Format</legend>
        <div className="flex rounded-lg border border-line p-0.5" role="group">
          {([["", "All"], ["fixed", "Buy now"], ["auction", "Auctions"]] as const).map(([v, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={format === (v || undefined)}
              onClick={() => setFormat((v || undefined) as ListingQuery["format"])}
              className={cn(
                "min-h-11 flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                focusCls,
                format === (v || undefined) ? "bg-accent text-on-accent" : "text-ink-dim hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-type`} className="mb-2 block text-sm font-semibold text-ink">
          Type
        </label>
        <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as ListingType | "")} className={fieldCls}>
          {TYPES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={graded}
          onChange={(e) => setGraded(e.target.checked)}
          className={cn("h-5 w-5 accent-accent", focusCls)}
        />
        Graded slabs only
      </label>

      <div>
        <label htmlFor={`${id}-language`} className="mb-2 block text-sm font-semibold text-ink">
          Language
        </label>
        <select id={`${id}-language`} value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldCls}>
          <option value="">Any language</option>
          {LANGUAGE_OPTIONS.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Price (₱)</legend>
        <div className="flex gap-2">
          <input
            aria-label="Minimum price"
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={cn(fieldCls, "font-mono tabular-nums")}
          />
          <input
            aria-label="Maximum price"
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={cn(fieldCls, "font-mono tabular-nums")}
          />
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-10 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block" aria-label="Filters">
        {controls(asideId)}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
          {[{ slug: undefined, name: "All" }, ...chips].map((c) => (
            <button
              key={c.slug ?? "all"}
              type="button"
              aria-pressed={category === c.slug}
              onClick={() => {
                setCategory(c.slug);
                if (c.slug) recordAffinityEvent(c.slug, "browse");
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                focusCls,
                category === c.slug
                  ? "border-accent bg-accent font-semibold text-on-accent"
                  : "border-line bg-elevated text-ink-dim hover:border-line-hv hover:text-ink",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {aiChips.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-accent" title="Read from your search">
              <Sparkles size={12} aria-hidden />
              {aiChips.map((c) => (
                <span key={c} className="rounded border border-accent/40 px-1.5 py-0.5">
                  {c}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-ink-dim" aria-live="polite">
            <span className="font-mono tabular-nums text-ink">{total.toLocaleString()}</span> result{total === 1 ? "" : "s"}
            {q && <> for “{q}”</>}
            {initial.player && <> for {initial.player}</>}
          </p>

          <div className="flex items-center gap-2">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink lg:hidden",
                focusCls,
              )}
            >
              <SlidersHorizontal size={14} aria-hidden />
              Filters{activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-on-accent">{activeCount}</span>}
            </button>
            <select
              aria-label="Sort results"
              value={sort}
              onChange={(e) => setSort(e.target.value as NonNullable<ListingQuery["sort"]>)}
              className={cn("min-h-11 rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-ink focus:border-accent", focusCls)}
            >
              {SORTS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {feed.isPending || !parseSettled ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/5.4] animate-pulse rounded-xl bg-elevated" />
            ))}
          </div>
        ) : feed.isError && results.length === 0 ? (
          <div role="alert" className="rounded-xl border border-dashed border-line-hv py-20 text-center">
            <p className="font-display text-xl text-ink">Couldn’t load listings</p>
            <p className="mt-2 text-sm text-ink-dim">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => feed.refetch()}
              className={cn("mt-6 min-h-11 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover", focusCls)}
            >
              Try again
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-hv py-20 text-center">
            <p className="font-display text-xl text-ink">No cards found</p>
            <p className="mt-2 text-sm text-ink-dim">Try widening your filters or searching for something else.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            {feed.isFetchNextPageError && (
              <div role="alert" className="mt-6 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-ink-dim">Couldn’t load more listings.</p>
                <button
                  type="button"
                  onClick={() => feed.fetchNextPage()}
                  className={cn("min-h-11 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover", focusCls)}
                >
                  Try again
                </button>
              </div>
            )}
            {feed.hasNextPage && !feed.isFetchNextPageError && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => feed.fetchNextPage()}
                  disabled={feed.isFetchingNextPage}
                  className={cn(
                    "min-h-11 rounded-lg border border-line px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50",
                    focusCls,
                  )}
                >
                  {feed.isFetchingNextPage ? "Loading…" : `Load more (${(total - results.length).toLocaleString()} left)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/60" onClick={() => setSheetOpen(false)} />
          <div ref={sheetRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 outline-none max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-line bg-base p-6 pb-10 shadow-lifted">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-lg text-ink">Filters</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className={cn("flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink", focusCls)}
              >
                <X size={20} />
              </button>
            </div>
            {controls(sheetId)}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className={cn("mt-6 min-h-11 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-on-accent hover:bg-accent-hover", focusCls)}
            >
              Show {total.toLocaleString()} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
