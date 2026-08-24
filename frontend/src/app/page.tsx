import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketTicker } from "@/components/layout/ticker";
import { HeroSearch } from "@/components/home/hero-search";
import { HeroShowcase } from "@/components/home/hero-showcase";
import { GrailShowcase } from "@/components/home/grail-showcase";
import { Reveal } from "@/components/motion/reveal";
import { ListingCard } from "@/components/cards/listing-card";
import { fetchFeed, fetchMovers } from "@/lib/api";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="group flex items-center gap-1 text-sm text-ink-dim transition-colors hover:text-gold">
          View all
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [all, auctions, movers] = await Promise.all([fetchFeed(), fetchFeed({ format: "auction", sort: "ending" }), fetchMovers()]);
  const recent = all.slice(0, 10);
  const ending = auctions.slice(0, 4);
  const gainers = [...movers].sort((a, b) => b.changePct - a.changePct);
  const featured = [all.find((l) => l.id === "l06"), all.find((l) => l.id === "l21"), all.find((l) => l.id === "l15")].filter(
    (l): l is NonNullable<typeof l> => Boolean(l),
  );
  const grail = all.find((l) => l.id === "l06")!;

  return (
    <div>
      <MarketTicker movers={movers} />

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-16 sm:pt-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:px-8">
        <HeroSearch listingCount={all.length} />
        <HeroShowcase listings={featured} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8" aria-labelledby="ending-soon">
        <Reveal>
          <SectionHead title="Ending soon" href="/browse?format=auction&sort=ending" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ending.map((l, i) => (
              <Reveal key={l.id} delay={i * 70}>
                <ListingCard listing={l} />
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="border-y border-line bg-elevated/50 py-16" aria-labelledby="recently-listed">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <SectionHead title="Freshly listed" href="/browse" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {recent.map((l, i) => (
                <Reveal key={l.id} delay={(i % 5) * 60}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {grail && <GrailShowcase listing={grail} />}

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8" aria-labelledby="market-pulse">
        <SectionHead title="Market pulse" />
        <div className="overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wider text-ink-faint">
                <th scope="col" className="px-5 py-3.5 font-medium">Player</th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium sm:table-cell">Median (30d)</th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium md:table-cell">Sales</th>
                <th scope="col" className="px-5 py-3.5 text-right font-medium">30d change</th>
              </tr>
            </thead>
            <tbody>
              {gainers.map((m) => (
                <tr key={m.player} className="border-b border-line/60 transition-colors last:border-0 hover:bg-raised">
                  <td className="px-5 py-4">
                    <Link href={`/browse?player=${encodeURIComponent(m.player)}`} className="font-medium text-ink hover:text-gold">
                      {m.player}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-ink-faint">{m.team}</span>
                    {m.category && m.category !== "nba" && (
                      <span className="ml-1.5 rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-dim">{m.category.replace("_", " ")}</span>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 font-mono tabular-nums text-ink sm:table-cell">{formatPeso(m.medianPrice)}</td>
                  <td className="hidden px-5 py-4 font-mono tabular-nums text-ink-dim md:table-cell">{m.salesCount}</td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 font-mono text-xs",
                        m.changePct >= 0 ? "bg-confirmed/10 text-confirmed" : "bg-urgent/10 text-urgent",
                      )}
                    >
                      {m.changePct >= 0 ? "▲" : "▼"} {Math.abs(m.changePct).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8" aria-labelledby="popular-players">
        <SectionHead title="Popular players" />
        <div className="flex flex-wrap gap-2.5">
          {["Victor Wembanyama", "LeBron James", "Stephen Curry", "Anthony Edwards", "Giannis Antetokounmpo", "Jordan Clarkson", "Luka Dončić"].map((p) => (
            <a
              key={p}
              href={`/browse?player=${encodeURIComponent(p)}`}
              className="rounded-full border border-line-hv bg-elevated px-5 py-2 text-sm text-ink transition-all hover:border-gold hover:bg-gold hover:text-ink"
            >
              {p}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
