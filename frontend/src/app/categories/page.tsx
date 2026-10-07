import type { Metadata } from "next";
import { GameCapsule } from "@/components/home/game-capsule";
import { SectionTitle } from "@/components/ui/section-title";
import { loadCategories } from "@/lib/api";
import { groupCategories } from "@/lib/categories";

export const metadata: Metadata = { title: "All games" };
export const dynamic = "force-dynamic";

/** Every game, grouped, with live counts. A failed read falls to app/error.tsx with its retry. */
export default async function CategoriesPage() {
  const categories = await loadCategories();
  const total = categories.reduce((n, c) => n + c.activeListings, 0);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 md:px-8 xl:px-20">
      <h1 className="t-display-phone text-ink md:t-display">All games</h1>
      <p className="mt-2 text-[15px] text-ink-dim">
        {categories.length} games · {total.toLocaleString("en-PH")} cards for sale
      </p>
      {groupCategories(categories).map((g) => (
        <section key={g.group} aria-labelledby={`group-${g.group}`} className="mt-10">
          <SectionTitle id={`group-${g.group}`}>{g.label}</SectionTitle>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4">
            {g.categories.map((c) => (
              <li key={c.slug}>
                <GameCapsule category={c} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
