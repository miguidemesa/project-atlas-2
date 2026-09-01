export type DealRating = "great" | "fair" | "above";

export interface DealScore {
  rating: DealRating;
  medianPhp: number;
  deltaPct: number;
  samples: number;
}

export type Category = "nba" | "pokemon" | "one_piece" | "disney";

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
}

export interface MarketMover {
  player: string;
  team: string;
  category?: Category;
  changePct: number;
  medianPrice: number;
  salesCount: number;
}
