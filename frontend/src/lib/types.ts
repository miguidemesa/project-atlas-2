export type DealRating = "great" | "fair" | "above";

export interface DealScore {
  rating: DealRating;
  medianPhp: number;
  deltaPct: number;
  samples: number;
}

// ---- P1 API types (Task 9): carried forward by Task 12; keep this block contiguous ----
/** A slug from GET /api/categories, e.g. "pokemon" or "basketball". */
export type Category = string;

export interface CategoryInfo {
  slug: string;
  name: string;
  group: "tcg" | "sports" | "nonsport";
  hue: number;
  activeListings: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SetSummary {
  name: string;
  listings: number;
  fromPrice: number | null;
}

export interface RecentSale {
  listingId: string;
  title: string;
  category: string;
  price: number;
  soldAt: string;
  imageUrl: string | null;
}

/** Seller stats from real data only; ratingAvg is null until the first review. */
export interface SellerSummary {
  id: string;
  displayName: string;
  ratingAvg: number | null;
  ratingCount: number;
  soldCount: number;
  joinedYear: number;
  verified: boolean;
}

export interface Storefront {
  category: string | null;
  activeListings: number;
  categories: { category: string; activeListings: number }[];
  spotlight: Listing[];
  trending: Listing[];
  grails: Listing[];
  endingSoon: Listing[];
  newArrivals: Listing[];
  recentlySold: RecentSale[];
  sets: SetSummary[];
  generatedAt: string;
}

export interface ListingDetail {
  listing: Listing;
  seller: SellerSummary | null;
  history: PricePoint[];
}

export interface SellerPage {
  seller: SellerSummary;
  listings: Listing[];
}
// ---- end P1 API types ----

export type ListingType = "single_card" | "lot" | "hobby_box" | "accessory";
export type ListingFormat = "fixed" | "auction";

export interface Seller {
  id: string;
  handle: string;
  displayName: string;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  joinedYear: number;
  verified: boolean;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Listing {
  id: string;
  imageUrl?: string;
  category: Category;
  title: string;
  player: string;
  team: string;
  year: number;
  set: string;
  parallel?: string;
  numbered?: boolean;
  serialNumber?: string;
  graded?: boolean;
  gradingCompany?: string;
  gradeValue?: string;
  condition?: string;
  type: ListingType;
  format: ListingFormat;
  price: number;
  previousPrice?: number;
  currentBid?: number;
  bidCount?: number;
  endsAt?: string;
  views?: number;
  watchers?: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  sellerId: string;
  dealScore?: DealScore;
  description?: string;
  cardNumber?: string | null;
  language?: string;
  sellerName?: string;
  photos?: string[];
}

export interface MarketMover {
  player: string;
  team: string;
  category?: Category;
  changePct: number;
  medianPrice: number;
  salesCount: number;
}
