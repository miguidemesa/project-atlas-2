import Link from "next/link";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { ForYou } from "@/components/home/for-you";
import { GameCapsule } from "@/components/home/game-capsule";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { Shelf } from "@/components/home/shelf";
import { SoldStrip } from "@/components/home/sold-strip";
import { StoreRail } from "@/components/home/store-rail";
import { StoreTabs } from "@/components/home/store-tabs";
import { buttonGhost } from "@/components/ui/button-styles";
import { SectionTitle } from "@/components/ui/section-title";
import { loadCategories, loadStorefront } from "@/lib/api";
import { busiest } from "@/lib/categories";
import { storeTabs } from "@/lib/store-tabs";
import type { CategoryInfo, Storefront } from "@/lib/types";

export const dynamic = "force-dynamic";

/** One failed read hides its sections instead of taking the whole page down. */
async function orNull<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [store, categoryList] = await Promise.all([orNull<Storefront>(loadStorefront()), orNull<CategoryInfo[]>(loadCategories())]);
  const categories = categoryList ?? [];
  const games = busiest(categories, 8);
  const tabs = store ? storeTabs(store) : [];

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-8 min-[1100px]:grid min-[1100px]:grid-cols-[220px_minmax(0,1fr)] min-[1100px]:gap-10 xl:px-20">
      <StoreRail categories={categories} className="hidden min-[1100px]:block" />
      <div className="flex min-w-0 flex-col gap-8 md:gap-14">
        <h1 className="sr-only">Atlas trading card store</h1>
        {!store && (
          <p role="status" className="rounded-[16px] border border-line bg-elevated p-5 text-sm text-ink-dim">
            The store is unavailable right now. Reload in a moment, or search above.
          </p>
        )}
        {store && <FeaturedCarousel listings={store.spotlight} />}
        {tabs.length > 0 && <StoreTabs tabs={tabs} />}
        {games.length > 0 && (
          <section aria-labelledby="browse-by-game">
            <SectionTitle id="browse-by-game" action={{ href: "/categories", label: "All games" }}>
              Browse by game
            </SectionTitle>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4">
              {games.map((c) => (
                <li key={c.slug}>
                  <GameCapsule category={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {store && <SoldStrip sales={store.recentlySold} />}
        {store && <Shelf id="grails" title="Grails" href="/browse?sort=price_desc" listings={store.grails} />}
        <ForYou categories={categories} />
        <RecentlyViewed />
        <section
          aria-labelledby="sell-cta"
          className="flex flex-col items-start gap-5 rounded-[16px] border border-line bg-elevated p-6 md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div className="max-w-xl">
            <h2 id="sell-cta" className="t-title-1-phone text-ink md:t-title-1">Have cards to sell?</h2>
            <p className="mt-2 text-[15px] leading-[22px] text-ink-dim">Any game, any sport. Photograph the front and back, and set your price in pesos.</p>
          </div>
          <Link href="/sell" className={buttonGhost}>Sell a card</Link>
        </section>
      </div>
    </div>
  );
}
