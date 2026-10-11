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

/** A seller ranked by paid orders in the last 30 days (real orders only). */
export interface TopSeller {
  id: string;
  displayName: string;
  sales: number;
  verified: boolean;
  listings: Listing[];
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
  topSellers: TopSeller[];
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

export interface PricePoint {
  date: string;
  price: number;
}

/** Mirrors the API's ListingDto. Fields the API can return as null are nullable here. */
export interface Listing {
  id: string;
  category: Category;
  title: string;
  /** The player on a sports card; the card or character name for every other game. */
  player: string;
  team?: string | null;
  year?: number | null;
  set: string;
  cardNumber?: string | null;
  language: string;
  parallel?: string | null;
  numbered?: boolean;
  serialNumber?: string | null;
  graded?: boolean;
  gradingCompany?: string | null;
  gradeValue?: string | null;
  condition?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  photos: string[];
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  price: number;
  currentBid?: number | null;
  bidCount?: number | null;
  endsAt?: string | null;
  type: ListingType;
  format: ListingFormat;
  status: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  dealScore?: DealScore | null;
}
