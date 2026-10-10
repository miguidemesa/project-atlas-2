import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { ListingCard } from "@/components/cards/listing-card";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { Shelf } from "@/components/home/shelf";
import { SoldStrip } from "@/components/home/sold-strip";
import { EmptyHub } from "@/components/hub/empty-hub";
import { HubSets } from "@/components/hub/hub-sets";
import { SectionTitle } from "@/components/ui/section-title";
import { loadCategories, loadFeed, loadStorefront } from "@/lib/api";
import { skinFor, skinVars } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { LANGUAGE_OPTIONS } from "@atlas/api";
import { HUB_TABS, hubFeedQuery, hubGame, hubHref, hubTab, type HubTab } from "@/lib/hub";
import type { CategoryInfo, Listing, Paged, Storefront } from "@atlas/api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string; lang?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = hubGame(await loadCategories().catch(() => []), slug);
  return { title: game ? `${game.name} cards` : "Game not found" };
}

const TAB_EMPTY: Record<Exclude<HubTab, "overview" | "sets">, string> = {
  singles: "single cards",
  graded: "graded cards",
  sealed: "sealed product",
};

export default async function HubPage({ params, searchParams }: Props) {
  const [{ slug }, sp, categories] = await Promise.all([params, searchParams, loadCategories()]);
  const game = hubGame(categories, slug);
  if (!game) notFound();

  const tab = hubTab(sp.tab);
  const language = LANGUAGE_OPTIONS.some(([code]) => code === sp.lang) ? sp.lang : undefined;
  const feedQuery = hubFeedQuery(game.slug, tab, language);
  const [store, feed] = await Promise.all([
    tab === "overview" || tab === "sets" ? loadStorefront(game.slug) : Promise.resolve(null),
    feedQuery ? loadFeed(feedQuery) : Promise.resolve(null),
  ]);

  return (
    <div style={skinVars(skinFor(game.slug, game.hue))} className="min-h-dvh bg-[color:var(--skin-ground)]">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 md:px-8 xl:px-20">
        <header className="flex flex-col gap-4 border-b border-[color:var(--skin-line)] pb-6">
          <h1 className="t-hub-title-phone text-ink md:t-hub-title">{game.name}</h1>
          <p className="text-[15px] text-[color:var(--skin-text)]">
            {game.activeListings > 0 ? `${game.activeListings} cards for sale` : "No listings yet"}
          </p>
          <form action="/browse" role="search" className="relative max-w-xl">
            <input type="hidden" name="category" value={game.slug} />
            <label htmlFor="hub-search" className="sr-only">Search {game.name} listings</label>
            <Search size={18} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--skin-faint)]" />
            <input
              id="hub-search"
              name="q"
              type="search"
              placeholder={`Search ${game.name}`}
              className="h-12 w-full rounded-full border border-[color:var(--skin-line-strong)] bg-[color:var(--skin-surface)] pl-11 pr-4 text-base text-ink placeholder:text-[color:var(--skin-faint)] focus:border-accent focus:outline-none"
            />
          </form>
          <nav aria-label={`${game.name} market`} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
            {HUB_TABS.map((t) => (
              <Link
                key={t.id}
                href={hubHref(game.slug, t.id)}
                aria-current={t.id === tab ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                  t.id === tab
                    ? "bg-[color:var(--skin-accent)] text-[color:var(--skin-on-accent)]"
                    : "text-[color:var(--skin-text)] hover:bg-[color:var(--skin-raised)] hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </header>

        {game.activeListings === 0 ? (
          <EmptyHub name={game.name} />
        ) : (
          <div className="mt-8 flex flex-col gap-10 md:gap-14">
            {tab === "overview" && store && <Overview game={game} store={store} latest={feed} language={language} />}
            {tab === "sets" && store && <HubSets id="sets" sets={store.sets} category={game.slug} />}
            {(tab === "singles" || tab === "graded" || tab === "sealed") && feed && (
              <ListingGrid
                listings={feed.items}
                empty={`No ${TAB_EMPTY[tab]} for ${game.name} right now.`}
                more={feed.total > feed.items.length ? `/browse?${new URLSearchParams({ category: game.slug, ...(tab === "graded" ? { graded: "true" } : { type: tab === "singles" ? "single_card" : "hobby_box" }) })}` : undefined}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Overview({ game, store, latest, language }: { game: CategoryInfo; store: Storefront; latest: Paged<Listing> | null; language?: string }) {
  return (
    <>
      <FeaturedCarousel listings={store.spotlight} label={`Featured in ${game.name}`} />
      <Shelf id="hub-trending" title="Trending" href={`/browse?category=${game.slug}&sort=popular`} listings={store.trending} />
      <Shelf id="hub-ending" title="Ending soon" href={`/browse?category=${game.slug}&format=auction&sort=ending`} listings={store.endingSoon} />
      <HubSets id="hub-sets" sets={store.sets} category={game.slug} limit={8} viewAll={hubHref(game.slug, "sets")} />
      <SoldStrip id="hub-sold" sales={store.recentlySold} />
      {latest && (
        <section aria-labelledby="hub-latest">
          <SectionTitle id="hub-latest" action={{ href: `/browse?category=${game.slug}`, label: "View all" }}>
            Latest {game.name} listings
          </SectionTitle>
          <nav aria-label="Card language" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {[["", "All languages"] as const, ...LANGUAGE_OPTIONS].map(([code, name]) => (
              <Link
                key={code || "all"}
                href={hubHref(game.slug, "overview", code || undefined)}
                aria-current={(language ?? "") === code ? "true" : undefined}
                className="inline-flex h-11 shrink-0 items-center"
              >
                <span
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold",
                    (language ?? "") === code
                      ? "border-transparent bg-ink text-base"
                      : "border-[color:var(--skin-line-strong)] text-[color:var(--skin-text)] hover:text-ink",
                  )}
                >
                  {name}
                </span>
              </Link>
            ))}
          </nav>
          <ListingGrid listings={latest.items} empty={`No ${game.name} listings in that language right now.`} />
        </section>
      )}
    </>
  );
}

function ListingGrid({ listings, empty, more }: { listings: Listing[]; empty: string; more?: string }) {
  if (listings.length === 0) return <p className="text-[15px] text-[color:var(--skin-text)]">{empty}</p>;
  return (
    <div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
        {listings.map((l) => (
          <li key={l.id}>
            <ListingCard listing={l} />
          </li>
        ))}
      </ul>
      {more && (
        <Link href={more} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-accent-hover">
          See every listing in the marketplace
        </Link>
      )}
    </div>
  );
}
