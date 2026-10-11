import { ListingCard } from "@/components/cards/listing-card";
import { SwipeRow } from "@/components/ui/swipe-row";
import type { Listing } from "@atlas/api";

/** A titled swipe row of listings (arrows on the web, swipe on phones). Hidden when empty. */
export function Shelf({ id, title, sub, href, listings }: { id: string; title: string; sub?: string; href?: string; listings: Listing[] }) {
  if (listings.length === 0) return null;
  return (
    <SwipeRow id={id} title={title} sub={sub} href={href}>
      {listings.map((l) => (
        <li key={l.id} className="snap-start">
          <ListingCard listing={l} />
        </li>
      ))}
    </SwipeRow>
  );
}
