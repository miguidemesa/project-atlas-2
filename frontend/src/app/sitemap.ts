import type { MetadataRoute } from "next";
import { fetchFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/browse", "/sell", "/login", "/register", "/condition-guide"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  try {
    const listings = await fetchFeed();
    return [
      ...staticRoutes,
      ...listings.map((l) => ({
        url: `${base}/listing/${l.id}`,
        lastModified: new Date(l.updatedAt ?? l.createdAt),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
