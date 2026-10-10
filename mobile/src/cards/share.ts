import type { Listing } from "@atlas/api";
import { Share } from "react-native";
import { WEB_URL } from "@/api/client";

/** The listing's page on the web: the link a shared card opens, with or without the app. */
export function listingWebUrl(listing: Pick<Listing, "id">): string {
  return `${WEB_URL.replace(/\/+$/, "")}/listing/${listing.id}`;
}

export async function shareListing(listing: Pick<Listing, "id" | "title">): Promise<void> {
  const url = listingWebUrl(listing);
  try {
    // iOS shares `url` as a link; Android only reads `message`.
    await Share.share({ message: `${listing.title} on Atlas: ${url}`, url, title: listing.title });
  } catch {
    // The system share sheet shows its own errors; there is nothing for the app to add.
  }
}
