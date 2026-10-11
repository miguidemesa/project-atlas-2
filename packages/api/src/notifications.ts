/** Alert categories: the API's names, the app's Android channels and the settings screen's rows, in the API's order. */
export const NOTIFICATION_CATEGORIES = [
  { id: "bids", name: "Bids and auctions", description: "Outbids, auctions ending soon, wins and losses" },
  { id: "orders", name: "Orders", description: "Payments, shipping and delivery" },
  { id: "offers", name: "Offers", description: "Offers you get, counters and answers" },
  { id: "following", name: "Following", description: "New posts from sellers you follow" },
  { id: "announcements", name: "Announcements", description: "News from Atlas" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["id"];

export interface NotificationPreference {
  category: NotificationCategory;
  pushEnabled: boolean;
}
