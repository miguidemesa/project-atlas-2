"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import type { CategoryInfo } from "@/lib/types";

export function HeroSearch({ listingCount, categories }: { listingCount?: number; categories: CategoryInfo[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const chips: [string, string][] = [
    ["All", ""],
    ...categories.map((c): [string, string] => [c.name, `category=${c.slug}`]),
    ["Graded", "graded=true"],
    ["Auctions", "format=auction"],
  ];

  return (
    <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
      <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-6xl">
        The Philippine home
        <br />
        of <span className="text-accent">cardboard.</span>
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
          placeholder="Try “Charizard 151”, “PSA 10” or “Wembanyama rookie”…"
          aria-label="Search the marketplace"
          className="w-full rounded-xl border border-line-hv bg-elevated py-3.5 pl-12 pr-28 text-base text-ink shadow-card placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Search
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
        {chips.map(([label, params]) => (
          <a
            key={label}
            href={`/browse${params ? `?${params}` : ""}`}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-ink-dim transition-colors hover:border-accent hover:text-accent"
          >
            {label}
          </a>
        ))}
      </div>

      {listingCount !== undefined && (
        <p className="mt-6 font-mono text-xs text-ink-faint">
          <CountUp value={listingCount} /> live listings
        </p>
      )}
    </div>
  );
}
