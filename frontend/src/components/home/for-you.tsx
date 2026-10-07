"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Reveal } from "@/components/motion/reveal";
import { ListingCard } from "@/components/cards/listing-card";
import { loadFeed } from "@/lib/api";
import { categoryName } from "@/lib/categories";
import type { CategoryInfo, Listing } from "@/lib/types";
import { emptyScores, getAffinity, personalRelevance, topCategory } from "@/lib/affinity";

/**
 * "For you" rail — re-ranks the live feed by the visitor's affinity profile
 * blended with freshness. Hidden entirely for cold-start visitors (no
 * clear interest signal yet) so the homepage stays editorial by default.
 */
export function ForYou({ categories }: { categories: CategoryInfo[] }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // read after hydration only — localStorage is unavailable during SSR
  const { data } = useQuery({
    queryKey: ["feed", "for-you"],
    queryFn: () => loadFeed({ pageSize: 30 }).then((page) => page.items),
    staleTime: 60_000,
    enabled: hydrated,
  });

  const scores = hydrated ? getAffinity() : emptyScores();
  const interest = hydrated ? topCategory(scores) : null;

  let ranked: Listing[] = [];
  if (data && interest) {
    const now = Date.now();
    ranked = [...data]
      .sort((a, b) => {
        const boostA = a.category === interest.category ? 1.15 : 1;
        const boostB = b.category === interest.category ? 1.15 : 1;
        return personalRelevance(b, scores, now) * boostB - personalRelevance(a, scores, now) * boostA;
      })
      .slice(0, 5);
  }

  if (!interest || ranked.length === 0) return null;

  const label = categoryName(categories, interest.category) ?? interest.category;
  const sharePct = Math.round(interest.share * 100);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8" aria-labelledby="for-you">
      <Reveal>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 id="for-you" className="font-display text-2xl text-ink sm:text-3xl">
              More {label} for you
            </h2>
            <p
              className="mt-1 text-xs text-ink-faint"
              title="Atlas ranks this rail by what you view, watch and search — stored only on your device."
            >
              Tuned to your browsing · ~{sharePct}% of recent activity
            </p>
          </div>
          <a href={`/browse?category=${interest.category}`} className="text-sm text-ink-dim transition-colors hover:text-gold">
            Browse all {label}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ranked.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

