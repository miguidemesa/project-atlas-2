import type { Listing } from "@/lib/types";

const TEAM_COLORS: Record<string, [string, string]> = {
  "San Antonio Spurs": ["#3d4046", "#0c0c0e"],
  "Los Angeles Lakers": ["#4b2a72", "#1a1030"],
  "Golden State Warriors": ["#1d50a5", "#0e1f3d"],
  "Orlando Magic": ["#0f5257", "#082224"],
  "Minnesota Timberwolves": ["#20423c", "#0b1f1c"],
  "Dallas Mavericks": ["#1c3f6e", "#0b1526"],
  "Utah Jazz": ["#2c4a1e", "#101c0b"],
  "Milwaukee Bucks": ["#20544c", "#0a211d"],
  "Toronto Raptors": ["#4a2237", "#180b12"],
  "Indiana Pacers": ["#1f3d6e", "#0c1428"],
  "Oklahoma City Thunder": ["#4a2618", "#1a0d08"],
  "Red Hair Pirates": ["#7a1f2b", "#2b0a10"],
  "Straw Hat Crew": ["#1d3a5f", "#0b1425"],
};

const CATEGORY_PALETTES: Record<string, [string, string][]> = {
  pokemon: [
    ["#b3541e", "#3f1a08"],
    ["#c9a227", "#4a3808"],
    ["#2e6b34", "#0d2411"],
  ],
  one_piece: [
    ["#8f2d38", "#2b0c11"],
    ["#1f6f8b", "#0a2530"],
  ],
  disney: [
    ["#274b8f", "#0c1631"],
    ["#155a70", "#06202b"],
  ],
};

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const words = name.split(" ").filter((w) => /^[A-ZÀ-Ž]/.test(w));
  if (words.length >= 2) return words.map((w) => w[0]).slice(0, 2).join("");
  return name.slice(0, 2).toUpperCase();
}

function isFoil(l: Listing): boolean {
  const p = l.parallel?.toLowerCase() ?? "";
  return p.includes("silver") || p.includes("holo") || p.includes("ice") || p.includes("gold") || p.includes("crusade");
}

function isPremiumFoil(l: Listing): boolean {
  const p = l.parallel?.toLowerCase() ?? "";
  return p.includes("gold") || Boolean(l.numbered);
}

/**
 * Authored card artwork — synthetic by design (Phase 0-3 seed data has no
 * licensed photography). Deterministic per listing id.
 */
export function CardArt({ listing, large = false }: { listing: Listing; large?: boolean }) {
  const seed = hash(listing.id);
  const palettes = CATEGORY_PALETTES[listing.category] ?? [];
  const [c1, c2] =
    TEAM_COLORS[listing.team] ??
    palettes[hash(listing.player) % (palettes.length || 1)] ??
    ["#33363b", "#101114"];
  const angle = 20 + (seed % 5) * 14;
  const foil = isFoil(listing);
  const premium = isPremiumFoil(listing);
  const slab = Boolean(listing.graded);
  const label = listing.type === "single_card" ? initials(listing.player) : listing.set.slice(0, 2).toUpperCase();

  return (
    <svg
      viewBox="0 0 300 400"
      role="img"
      aria-label={`${listing.title} card artwork`}
      className="h-full w-full object-cover"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`bg-${listing.id}`} x1="0" y1="0" x2={angle / 90} y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`sheen-${listing.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={foil ? 0.28 : 0.1} />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={premium ? 0.14 : 0} />
        </linearGradient>
        {foil && (
          <linearGradient id={`foil-${listing.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C6A24B" stopOpacity="0.35" />
            <stop offset="30%" stopColor="#EDE6D6" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#8A8D93" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#C6A24B" stopOpacity="0.3" />
          </linearGradient>
        )}
      </defs>

      <rect width="300" height="400" fill={`url(#bg-${listing.id})`} />
      <polygon points="0,300 300,140 300,240 0,400" fill="#ffffff" opacity={foil ? 0.05 : 0.03} />
      <polygon points="0,340 300,180 300,210 0,370" fill={c1} opacity="0.5" />
      {foil && <polygon points="0,80 300,0 300,60 0,150" fill={`url(#foil-${listing.id})`} opacity="0.5" />}

      <rect x="10" y="10" width="280" height="380" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="16" y="16" width="268" height="368" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />

      <text
        x="150"
        y={large ? 218 : 210}
        textAnchor="middle"
        fontFamily="var(--font-bricolage)"
        fontWeight="700"
        fontSize={large ? 128 : 96}
        fill="#ffffff"
        fillOpacity={premium ? 0.85 : 0.6}
      >
        {label}
      </text>

      {listing.numbered && listing.serialNumber && (
        <text x="150" y="330" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="13" fill="#C6A24B" letterSpacing="2">
          {listing.serialNumber}
        </text>
      )}
      {listing.graded && listing.gradingCompany && (
        <>
          <rect x={150 - 52} y="342" width="104" height="24" rx="4" fill="#141517" opacity="0.75" />
          <text
            x="150"
            y="359"
            textAnchor="middle"
            fontFamily="var(--font-jetbrains)"
            fontSize="12"
            fill="#F2EFE9"
            letterSpacing="1"
          >
            {listing.gradingCompany} {listing.gradeValue}
          </text>
        </>
      )}
      {!listing.numbered && !listing.graded && (
        <text x="150" y="352" textAnchor="middle" fontFamily="var(--font-bricolage)" fontSize="12" fill="#ffffff" fillOpacity="0.55" letterSpacing="3">
          {listing.year} · {listing.set.toUpperCase()}
        </text>
      )}

      <rect width="300" height="400" fill={`url(#sheen-${listing.id})`} />

      {slab && (
        <>
          <polygon points="0,0 190,0 90,400 0,400" fill="#ffffff" opacity="0.06" />
          <polygon points="200,0 230,0 130,400 100,400" fill="#ffffff" opacity="0.05" />
        </>
      )}
    </svg>
  );
}
