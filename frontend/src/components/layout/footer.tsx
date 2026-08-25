import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-xl text-ink">
            Atlas<span className="text-gold">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-dim">
            The Philippine marketplace for NBA, Pokémon, One Piece and Disney collectible cards.
          </p>
        </div>

        {[
          { title: "Marketplace", links: [["Browse cards", "/browse"], ["Live auctions", "/browse?format=auction"], ["Sealed boxes", "/browse?type=hobby_box"], ["Start selling", "/sell"]] },
          { title: "Account", links: [["Sign in", "/login"], ["Create account", "/register"], ["Seller profiles", "/sellers/s1"]] },
          { title: "Trust & Safety", links: [["Card condition guide", "/condition-guide"], ["Buyer protection", "/"], ["Escrow, how it works", "/"], ["Report a listing", "/"]] },
        ].map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-dim">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-gold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 Atlas Marketplace. All prices in Philippine pesos.</p>
          <p>Mockup seed data. Pokémon card scans via pokemontcg.io are © Nintendo / Creatures / GAME FREAK — placeholders pending seller uploads.</p>
        </div>
      </div>
    </footer>
  );
}
