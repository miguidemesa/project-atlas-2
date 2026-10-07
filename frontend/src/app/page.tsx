import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSearch } from "@/components/home/hero-search";
import { HeroShowcase } from "@/components/home/hero-showcase";
import { GrailShowcase } from "@/components/home/grail-showcase";
import { ForYou } from "@/components/home/for-you";
import { SoldStrip } from "@/components/home/sold-strip";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { CategoryDoors } from "@/components/home/category-doors";
import { Reveal } from "@/components/motion/reveal";
import { ListingCard } from "@/components/cards/listing-card";
import { loadCategories, loadStorefront } from "@/lib/api";
import { busiest } from "@/lib/categories";
import type { CategoryInfo, Listing, Storefront } from "@/lib/types";

export const dynamic = "force-dynamic";

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="group flex min-h-11 items-center gap-1 text-sm text-ink-dim transition-colors hover:text-gold">
          View all
          <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/** A titled row of listings. Renders nothing when the shelf is empty. */
function Shelf({ title, href, listings, band = false }: { title: string; href: string; listings: Listing[]; band?: boolean }) {
  if (listings.length === 0) return null;
  const content = (
    <Reveal>
      <SectionHead title={title} href={href} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {listings.map((l, i) => (
          <Reveal key={l.id} delay={(i % 5) * 60}>
            <ListingCard listing={l} />
          </Reveal>
        ))}
      </div>
    </Reveal>
  );
  return band ? (
    <section className="border-y border-line bg-elevated/50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">{content}</div>
    </section>
  ) : (
    <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">{content}</section>
  );
}

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
  const topCategories = busiest(categories, 8);

  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-16 sm:pt-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:px-8">
        <HeroSearch listingCount={store?.activeListings} categories={topCategories} />
        {store && store.spotlight.length > 0 && <HeroShowcase listings={store.spotlight} />}
      </section>

      {!store && (
        <p role="status" className="mx-auto mb-14 max-w-7xl px-4 text-sm text-ink-dim lg:px-8">
          The market is unavailable right now. Reload in a moment, or search above.
        </p>
      )}

      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-8" aria-label="Shop by game">
          <CategoryDoors categories={topCategories} />
        </section>
      )}

      <ForYou categories={categories} />
      <RecentlyViewed />

      {store && (
        <>
          <Shelf title="Ending soon" href="/browse?format=auction&sort=ending" listings={store.endingSoon.slice(0, 5)} />
          <Shelf title="Trending" href="/browse?sort=popular" listings={store.trending.slice(0, 5)} />
          <Shelf title="Freshly listed" href="/browse" listings={store.newArrivals.slice(0, 10)} band />
          <SoldStrip sales={store.recentlySold} />
          {store.grails[0] && <GrailShowcase listing={store.grails[0]} />}
        </>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 lg:px-8" aria-labelledby="sell-cta">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-gold/25 bg-elevated px-8 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 id="sell-cta" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Have cards to sell?
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-ink-dim">
              Any game, any sport. Photograph the front and back, and Atlas helps fill in the details. You set the price.
            </p>
          </div>
          <Link
            href="/sell"
            className="inline-flex min-h-11 flex-shrink-0 items-center rounded-lg bg-gold px-7 py-3 text-[15px] font-semibold text-base transition-colors hover:bg-gold-dim"
          >
            Sell a card
          </Link>
        </div>
      </section>
    </div>
  );
}
