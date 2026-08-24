import type { Listing, MarketMover, PricePoint, Seller } from "./types";

export const sellers: Seller[] = [
  { id: "s1", handle: "kolektibco", displayName: "Kolektib & Co.", ratingAvg: 4.9, ratingCount: 312, soldCount: 487, joinedYear: 2021, verified: true },
  { id: "s2", handle: "slabhuntermnl", displayName: "Slab Hunter MNL", ratingAvg: 4.8, ratingCount: 198, soldCount: 342, joinedYear: 2022, verified: true },
  { id: "s3", handle: "hoopermanila", displayName: "Hooper Manila", ratingAvg: 4.7, ratingCount: 96, soldCount: 154, joinedYear: 2023, verified: false },
  { id: "s4", handle: "hardwoodph", displayName: "Hardwood PH", ratingAvg: 4.9, ratingCount: 421, soldCount: 690, joinedYear: 2020, verified: true },
  { id: "s5", handle: "threepointcebu", displayName: "Three-Point Cebu", ratingAvg: 4.6, ratingCount: 74, soldCount: 118, joinedYear: 2024, verified: false },
];

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export const listings: Listing[] = [
  {
    id: "l01", category: "nba", title: "Victor Wembanyama 2023-24 Prizm Silver RC", player: "Victor Wembanyama", team: "San Antonio Spurs",
    year: 2023, set: "Prizm", parallel: "Silver", type: "single_card", format: "auction", price: 28000, currentBid: 26500,
    bidCount: 14, endsAt: hoursFromNow(2.4), views: 1843, watchers: 87, createdAt: daysAgo(4), sellerId: "s4",
    description: "Fresh from a hobby case. Centered with strong corners — looks gem out of the pack. Ships bubble-wrapped with tracking anywhere in PH.",
  },
  {
    id: "l02", category: "nba", title: "LeBron James 2019 Contenders Cracked Ice /23", player: "LeBron James", team: "Los Angeles Lakers",
    year: 2019, set: "Contenders", parallel: "Cracked Ice", numbered: true, serialNumber: "11/23", graded: true,
    gradingCompany: "PSA", gradeValue: "9", type: "single_card", format: "fixed", price: 42000, previousPrice: 39500,
    views: 972, watchers: 41, createdAt: daysAgo(2), sellerId: "s2",
    description: "Numbered cracked ice of the GOAT, slabbed PSA 9. Serial 11/23. A centerpiece card for any Lakers PC.",
  },
  {
    id: "l03", category: "nba", title: "Stephen Curry 2016 Select Courtside Gold /10", player: "Stephen Curry", team: "Golden State Warriors",
    year: 2016, set: "Select", parallel: "Courtside Gold", numbered: true, serialNumber: "07/10", type: "single_card",
    format: "fixed", price: 38500, previousPrice: 41000, views: 654, watchers: 29, createdAt: daysAgo(6), sellerId: "s1",
    description: "Rare gold parallel from the 73-win season sets. Sharp corners, minor edge wear on the back lower-left — priced accordingly.",
  },
  {
    id: "l04", category: "nba", title: "Paolo Banchero 2022-24 Crown Royale Rookie Lot (5)", player: "Paolo Banchero", team: "Orlando Magic",
    year: 2022, set: "Crown Royale", type: "lot", format: "fixed", price: 8500, views: 331, watchers: 12,
    createdAt: daysAgo(1), sellerId: "s3",
    description: "Five-card rookie lot: base, silver, two retail parallels and an insert. Great way to start a Magic PC without the single-RC premium.",
  },
  {
    id: "l05", category: "nba", title: "2023-24 NBA Hoops Hobby Box (Sealed)", player: "Multi-player", team: "Various",
    year: 2023, set: "NBA Hoops", type: "hobby_box", format: "fixed", price: 6500, previousPrice: 7000,
    views: 1204, watchers: 55, createdAt: daysAgo(3), sellerId: "s5",
    description: "Sealed hobby box, Winter release. Two autos or relics per box on average. Sourced from an authorized PH distributor.",
  },
  {
    id: "l06", category: "nba", title: "Anthony Edwards 2020 Prizm RC PSA 10", player: "Anthony Edwards", team: "Minnesota Timberwolves",
    year: 2020, set: "Prizm", graded: true, gradingCompany: "PSA", gradeValue: "10", type: "single_card", format: "auction",
    price: 55000, currentBid: 48000, bidCount: 22, endsAt: hoursFromNow(0.7), views: 3105, watchers: 143,
    createdAt: daysAgo(7), sellerId: "s1",
    description: "The Ant rookie in a black label-worthy slab. Population report favors this copy — clean surfaces, perfect centering.",
  },
  {
    id: "l07", category: "nba", title: "Luka Dončić 2018 Optic Holo /99", player: "Luka Dončić", team: "Dallas Mavericks",
    year: 2018, set: "Donruss Optic", parallel: "Holo", numbered: true, serialNumber: "52/99", type: "single_card",
    format: "fixed", price: 18500, previousPrice: 17250, views: 788, watchers: 33, createdAt: daysAgo(5), sellerId: "s2",
    description: "Holo parallel of the 2018 ROY. Numbered /99 with vivid refraction. Raw but candidate for grading.",
  },
  {
    id: "l08", category: "nba", title: "Jordan Clarkson 2023 Rise N Grade Crusade", player: "Jordan Clarkson", team: "Utah Jazz",
    year: 2023, set: "Rise N Grade", parallel: "Crusade", type: "single_card", format: "fixed", price: 3200,
    views: 512, watchers: 18, createdAt: daysAgo(1), sellerId: "s3",
    description: "For the Filipino hoops fan — Clarkson Crusade from his Sixth Man of the Year run.",
  },
  {
    id: "l09", category: "nba", title: "Giannis Antetokounmpo 2013 Prizm RC BGS 9.5", player: "Giannis Antetokounmpo", team: "Milwaukee Bucks",
    year: 2013, set: "Prizm", graded: true, gradingCompany: "BGS", gradeValue: "9.5", type: "single_card", format: "auction",
    price: 120000, currentBid: 98000, bidCount: 31, endsAt: hoursFromNow(9), views: 5421, watchers: 210,
    createdAt: daysAgo(9), sellerId: "s4",
    description: "The Greek Freak's true rookie, BGS 9.5 with two 9.5 subgrades. The Milwaukee era may be ending — this is the hold-everyone-talks-about.",
  },
  {
    id: "l10", category: "nba", title: "Kobe Bryant 2007 UD First Edition LOT of 12", player: "Kobe Bryant", team: "Los Angeles Lakers",
    year: 2007, set: "Upper Deck First Edition", type: "lot", format: "fixed", price: 12500, previousPrice: 13800,
    views: 443, watchers: 21, createdAt: daysAgo(8), sellerId: "s1",
    description: "Twelve Kobe base cards across 2007-09 Upper Deck releases. Mamba PC filler at below-per-card cost.",
  },
  {
    id: "l11", category: "nba", title: "Card Storage Bundle: 500 Sleeves + 25 Toploaders", player: "Supplies", team: "—",
    year: 2024, set: "—", type: "accessory", format: "fixed", price: 850, views: 214, watchers: 5,
    createdAt: daysAgo(2), sellerId: "s5",
    description: "Penny sleeves (500ct) plus premium toploaders (25ct). Perfect fit for standard 2.5x3.5 cards.",
  },
  {
    id: "l12", category: "nba", title: "Chet Holmgren 2023-24 Mosaic Reactive Orange", player: "Chet Holmgren", team: "Oklahoma City Thunder",
    year: 2023, set: "Mosaic", parallel: "Reactive Orange", type: "single_card", format: "fixed", price: 4200,
    previousPrice: 3800, views: 366, watchers: 14, createdAt: daysAgo(3), sellerId: "s3",
    description: "Reactive orange of OKC's unicorn. Eye appeal for days at this price point.",
  },
  {
    id: "l13", category: "nba", title: "Scottie Barnes 2021 Court Kings Fresh Paint RC", player: "Scottie Barnes", team: "Toronto Raptors",
    year: 2021, set: "Court Kings", parallel: "Fresh Paint", type: "single_card", format: "auction", price: 6000,
    currentBid: 5400, bidCount: 9, endsAt: hoursFromNow(26), views: 289, watchers: 11, createdAt: daysAgo(4),
    sellerId: "s2",
    description: "Painterly Fresh Paint rookie of the 2022 ROY. A set that rewards the eye, not just the POP report.",
  },
  {
    id: "l14", category: "nba", title: "Tyrese Haliburton 2020 Illusions Rookie Auto", player: "Tyrese Haliburton", team: "Indiana Pacers",
    year: 2020, set: "Illusions", graded: false, condition: "Near Mint", type: "single_card", format: "fixed",
    price: 9800, views: 401, watchers: 16, createdAt: daysAgo(5), sellerId: "s1",
    description: "On-card auto from Hali's rookie year in Indiana. League-pass favorite, priced before the next leap.",
  },
  {
    id: "l15", category: "pokemon", title: "Charizard 1999 Base Set PSA 9", player: "Charizard", team: "Kanto",
    year: 1999, set: "Base Set", graded: true, gradingCompany: "PSA", gradeValue: "9", type: "single_card",
    format: "auction", price: 185000, currentBid: 168000, bidCount: 38, endsAt: hoursFromNow(31), views: 8214,
    watchers: 312, createdAt: daysAgo(10), sellerId: "s4",
    description: "The king of vintage Pokémon. Shadowless-adjacent copy with strong gloss for the grade. Slab is clean with no clouding.",
  },
  {
    id: "l16", category: "pokemon", title: "Pikachu ex 2024 Surging Sparks SIR", player: "Pikachu ex", team: "Paldea",
    imageUrl: "/seed-images/pikachu-ex-ssp.png",
    year: 2024, set: "Surging Sparks", parallel: "Special Illustration Rare", type: "single_card", format: "fixed",
    price: 4200, previousPrice: 3800, views: 1532, watchers: 64, createdAt: daysAgo(1), sellerId: "s3",
    description: "The chase card of the set, pulled fresh from an ETB. Pack-fresh edges, ready for your binder or a grading submission.",
  },
  {
    id: "l17", category: "pokemon", title: "Giratina 2009 Platinum Holo Rare", player: "Giratina", team: "Sinnoh",
    year: 2009, set: "Platinum", parallel: "Holo", type: "single_card", format: "fixed", price: 2600,
    previousPrice: 2900,
    imageUrl: "/seed-images/giratina-v-crz.png", views: 887, watchers: 37, createdAt: daysAgo(6), sellerId: "s2",
    description: "Original Sinnoh-era holo. Holo pattern still vivid with light scratching visible under direct light — priced honestly for the grade.",
  },
  {
    id: "l18", category: "one_piece", title: "Shanks OP-02 Paramount War SEC", player: "Shanks", team: "Red Hair Pirates",
    year: 2023, set: "Paramount War", parallel: "Special Commander", type: "single_card", format: "fixed",
    price: 22000, previousPrice: 19500, views: 1975, watchers: 89, createdAt: daysAgo(3), sellerId: "s1",
    description: "SEC alt-art of the Emperor himself. Japanese print — sharper text and colors than the EN release. Near-mint straight from booster box.",
  },
  {
    id: "l19", category: "one_piece", title: "Monkey D. Luffy ST-08 Alternate Art", player: "Monkey D. Luffy", team: "Straw Hat Crew",
    year: 2023, set: "Ultra Deck", parallel: "Alt Art", type: "single_card", format: "fixed", price: 5800,
    views: 1204, watchers: 45, createdAt: daysAgo(2), sellerId: "s5",
    description: "Gear-powered Luffy alt art from the starter decks. A future classic leader card for any One Piece collection.",
  },
  {
    id: "l20", category: "one_piece", title: "Nami OP-05 Awakening Manga Rare", player: "Nami", team: "Straw Hat Crew",
    year: 2024, set: "Awakening", parallel: "Manga Rare", type: "single_card", format: "fixed", price: 3200,
    previousPrice: 2900, views: 654, watchers: 22, createdAt: daysAgo(4), sellerId: "s3",
    description: "Manga-texture rare from OP-05. The panel art style makes these pop hard in a toploader wall.",
  },
  {
    id: "l21", category: "disney", title: "Mickey Mouse 2023 Lorcana Enchanted", player: "Mickey Mouse", team: "Inklands",
    year: 2023, set: "The First Chapter", parallel: "Enchanted", type: "single_card", format: "auction",
    price: 28000, currentBid: 24500, bidCount: 17, endsAt: hoursFromNow(6), views: 3402, watchers: 156,
    createdAt: daysAgo(8), sellerId: "s2",
    description: "Brave Little Tailor enchanted — the crown jewel of chapter one. Pulled first-hand, sleeved immediately, never played.",
  },
  {
    id: "l22", category: "disney", title: "Elsa 2024 Lorcana Super Rare", player: "Elsa", team: "Arendelle",
    year: 2024, set: "Into the Inklands", parallel: "Foil", type: "single_card", format: "fixed", price: 12500,
    previousPrice: 13800, views: 987, watchers: 41, createdAt: daysAgo(5), sellerId: "s1",
    description: "Snow Queen foil with the full-art treatment. Frozen fans and competitive players both want this in the deck.",
  },
  {
    id: "l23", category: "disney", title: "Lorcana Stitch Playmat (Official)", player: "Stitch", team: "—",
    year: 2024, set: "Accessories", type: "accessory", format: "fixed", price: 750,
    views: 341, watchers: 9, createdAt: daysAgo(1), sellerId: "s5",
    description: "Official rubber-backed playmat. Tournament legal, stitched edges, stitch not included.",
  },
];

function seededWalk(id: string, end: number): PricePoint[] {
  let h = 1779033703;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const points: PricePoint[] = [];
  const n = 30;
  const now = Date.now();
  for (let i = n; i >= 0; i--) {
    const drift = 1 + (rand() - 0.48) * 0.06 * (i / n);
    const trend = 1 - (i / n) * (0.08 + rand() * 0.06) * (end > 10000 ? 1 : 0.5);
    points.push({
      date: new Date(now - i * 86400000).toISOString().slice(0, 10),
      price: Math.round(end * trend * drift),
    });
  }
  points[points.length - 1].price = end;
  return points;
}

const historyCache = new Map<string, PricePoint[]>();

export function priceHistory(listing: Listing): PricePoint[] {
  const key = listing.id;
  if (!historyCache.has(key)) {
    historyCache.set(key, seededWalk(key, listing.currentBid ?? listing.price));
  }
  return historyCache.get(key)!;
}

export const movers: MarketMover[] = [
  { player: "Shanks", team: "OPC", category: "one_piece", changePct: 11.2, medianPrice: 21400, salesCount: 26 },
  { player: "Charizard", team: "POK", category: "pokemon", changePct: 7.6, medianPrice: 148500, salesCount: 33 },

  { player: "Victor Wembanyama", team: "SAS", changePct: 8.4, medianPrice: 26400, salesCount: 47 },
  { player: "Anthony Edwards", team: "MIN", changePct: 6.1, medianPrice: 48200, salesCount: 39 },
  { player: "Alperen Şengün", team: "HOU", changePct: 4.7, medianPrice: 9600, salesCount: 22 },
  { player: "Jayson Tatum", team: "BOS", changePct: -2.3, medianPrice: 15800, salesCount: 51 },
  { player: "Ja Morant", team: "MEM", changePct: -4.9, medianPrice: 7200, salesCount: 28 },
  { player: "Zion Williamson", team: "NOP", changePct: -7.2, medianPrice: 5400, salesCount: 19 },
  { player: "Pikachu", team: "POK", category: "pokemon", changePct: 3.4, medianPrice: 3800, salesCount: 58 },
  { player: "Mickey Mouse", team: "LOR", category: "disney", changePct: -2.1, medianPrice: 9600, salesCount: 17 },
];

export function getSeller(id: string): Seller {
  return sellers.find((s) => s.id === id) ?? sellers[0];
}

export function getListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}
