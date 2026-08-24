import Image from "next/image";
import { CardArt } from "./card-art";
import type { Listing } from "@/lib/types";

/**
 * Renders a listing's real photo when present (seller upload / licensed
 * seed scan), otherwise the authored synthetic SVG artwork.
 */
export function CardImage({ listing, large = false, eager = false }: { listing: Listing; large?: boolean; eager?: boolean }) {
  if (listing.imageUrl) {
    return (
      <Image
        src={listing.imageUrl}
        alt={`${listing.title} card`}
        fill
        sizes={large ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 640px) 240px, 50vw"}
        priority={eager}
        className="object-cover"
      />
    );
  }
  return <CardArt listing={listing} large={large} />;
}
