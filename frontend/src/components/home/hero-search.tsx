"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";

const CATEGORIES = [
  ["All", ""],
  ["NBA", "category=nba"],
  ["Pokémon", "category=pokemon"],
  ["One Piece", "category=one_piece"],
  ["Disney", "category=disney"],
  ["Graded", "graded=true"],
  ["Auctions", "format=auction"],
] as const;

export function HeroSearch({ listingCount }: { listingCount: number }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
      <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
        The Philippine home
        <br />
        of <span className="text-gold">cardboard.</span>
      </h1>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/browse?q=${encodeURIComponent(q.trim())}` : "/browse");
        }}
        className="relative mt-8"
      >
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try “Wembanyama rookie” or “PSA 10”…"
          aria-label="Search the marketplace"
          className="w-full rounded-xl border border-line-hv bg-elevated py-3.5 pl-12 pr-28 text-base text-ink shadow-card placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim"
        >
          Search
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
        {CATEGORIES.map(([label, params]) => (
          <a
            key={label}
            href={`/browse${params ? `?${params}` : ""}`}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-gold hover:text-gold"
          >
            {label}
          </a>
        ))}
      </div>

      <p className="mt-6 font-mono text-xs text-ink-faint">
        <CountUp value={listingCount} /> live listings ·{" "}
        <CountUp value={1247} /> collectors · <CountUp value={38} /> sellers nationwide
      </p>
    </div>
  );
}
