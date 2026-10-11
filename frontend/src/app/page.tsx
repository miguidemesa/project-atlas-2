import Link from "next/link";
import { cookies } from "next/headers";
import { GroupTile } from "@/components/cards/group-tile";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { GameCapsule } from "@/components/home/game-capsule";
import { Shelf } from "@/components/home/shelf";
import { ShopShowcase } from "@/components/home/shop-showcase";
import { SoldStrip } from "@/components/home/sold-strip";
import { StoreRail } from "@/components/home/store-rail";
import { YourGames } from "@/components/home/your-games";
import { buttonGhost } from "@/components/ui/button-styles";
import { SectionTitle } from "@/components/ui/section-title";
import { SwipeRow } from "@/components/ui/swipe-row";
import { loadCardGroups, loadCategories, loadFeed, loadStorefront } from "@/lib/api";
import { homeGames } from "@/lib/home-order";
import { INTEREST_COOKIE } from "@/lib/interest-cookie";
import type { CategoryInfo, Storefront, TopSeller } from "@atlas/api";

export const dynamic = "force-dynamic";

const CHIPS = 6;

/** One failed read hides its sections instead of taking the whole page down. */
async function orNull<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch {
    return null;
  }
}

/** Home v2 (spec §5): rows in a fixed order, tilted to the visitor's games; every row hides when it has no data. */
export default async function HomePage() {
  const [store, categoryList, jar] = await Promise.all([
    orNull<Storefront>(loadStorefront()),
    orNull<CategoryInfo[]>(loadCategories()),
    cookies(),
  ]);
  const categories = categoryList ?? [];
  const { personalized, own, order } = homeGames(categories, jar.get(INTEREST_COOKIE)?.value);
  const [top, second] = order;

  const [topStore, groups, secondFeed] = await Promise.all([
    personalized && top ? orNull(loadStorefront(top.slug)) : null,
    orNull(loadCardGroups(personalized ? top?.slug : undefined, 12)),
    second ? orNull(loadFeed({ category: second.slug, pageSize: 12 })) : null,
  ]);

  const tilted = (topStore?.spotlight.length ?? 0) > 0;
  const spotlight = tilted ? topStore!.spotlight : (store?.spotlight ?? []);
  const sellersInTop = (topStore?.topSellers.length ?? 0) > 0;
  const sellers: TopSeller[] = sellersInTop ? topStore!.topSellers : (store?.topSellers ?? []);
  // All-games counts only: the carousel says "N sales in 30 days", which a per-game count would understate.
  const salesBySeller = Object.fromEntries((store?.topSellers ?? []).map((s) => [s.id, s.sales]));

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
        <div className="flex min-w-0 flex-col gap-5">
          <FeaturedCarousel
            listings={spotlight}
            reason={tilted ? `Picked for you · you browse ${top!.name} most` : undefined}
            salesBySeller={salesBySeller}
          />
          <YourGames games={order.slice(0, CHIPS)} personalized={personalized} total={categories.length} />
        </div>
        {groups && groups.length > 0 && (
          <SwipeRow
            id="for-you"
            title={personalized ? `More ${top!.name} for you` : "New listings"}
            sub={personalized ? "Ordered by the games you view, search and watch on this device" : undefined}
            href={personalized ? `/c/${top!.slug}` : "/browse"}
          >
            {groups.map((g) => (
              <li key={g.key} className="snap-start">
                <GroupTile group={g} />
              </li>
            ))}
          </SwipeRow>
        )}
        {store && <Shelf id="ending" title="Ending soon" sub="Auctions closing soonest" href="/browse?sort=ending" listings={store.endingSoon} />}
        <ShopShowcase
          sellers={sellers}
          sub={sellersInTop ? `Sellers with the most paid orders in ${top!.name}, last 30 days` : undefined}
        />
        {second && secondFeed && (
          <Shelf
            id="second-game"
            title={`${second.name} picks`}
            sub={own >= 2 ? "Your second most viewed game" : "One of the busiest games on Atlas"}
            href={`/c/${second.slug}`}
            listings={secondFeed.items}
          />
        )}
        {store && <SoldStrip sales={store.recentlySold} />}
        {order.length > 0 && (
          <section aria-labelledby="browse-by-game">
            <SectionTitle id="browse-by-game" action={{ href: "/categories", label: "All games" }}>
              Browse by game
            </SectionTitle>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4">
              {order.map((c) => (
                <li key={c.slug}>
                  <GameCapsule category={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {store && (
          <Shelf id="grails" title="Grails" sub="The most expensive cards on Atlas right now" href="/browse?sort=price_desc" listings={store.grails} />
        )}
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
