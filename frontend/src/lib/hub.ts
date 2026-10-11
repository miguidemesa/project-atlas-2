import type { HubTab } from "@atlas/api";

export { HUB_TABS, hubFeedQuery, hubGame, hubTab, type HubTab } from "@atlas/api";

export function hubHref(slug: string, tab: HubTab, language?: string): string {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  if (language) params.set("lang", language);
  const query = params.toString();
  return query ? `/c/${slug}?${query}` : `/c/${slug}`;
}
