"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListingCard } from "@/components/cards/listing-card";
import { SectionTitle } from "@/components/ui/section-title";
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
    <section aria-labelledby="for-you">
      <SectionTitle id="for-you" action={{ href: `/c/${interest.category}`, label: `All ${label}` }}>
        More {label} for you
      </SectionTitle>
      <p className="-mt-2 mb-4 text-xs text-ink-faint" title="Atlas ranks this row by what you view, watch and search, stored only on your device.">
        Tuned to your browsing · about {sharePct}% of recent activity
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
        {ranked.map((l) => (
          <li key={l.id}>
            <ListingCard listing={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}
