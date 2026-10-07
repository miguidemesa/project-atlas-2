import { ListingCard } from "@/components/cards/listing-card";
import { SectionTitle } from "@/components/ui/section-title";
import type { Listing } from "@/lib/types";

/** A titled row of listings: a peeking swipe row on phones, an auto-fill grid of 172px+ tiles on the web. Hidden when empty. */
export function Shelf({ id, title, href, listings }: { id: string; title: string; href?: string; listings: Listing[] }) {
  if (listings.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id} action={href ? { href, label: "View all" } : undefined}>
        {title}
      </SectionTitle>
      <ul className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(172px,1fr))] md:overflow-visible md:px-0">
        {listings.map((l) => (
          <li key={l.id} className="w-[44vw] max-w-[200px] shrink-0 snap-start md:w-auto md:max-w-none">
            <ListingCard listing={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}
