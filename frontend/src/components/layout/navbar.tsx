"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Store } from "lucide-react";

export function Navbar() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Atlas home">
          <span className="font-display text-2xl tracking-tight text-ink">
            Atlas<span className="text-gold">.</span>
          </span>
        </Link>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/browse?q=${encodeURIComponent(q.trim())}` : "/browse");
          }}
          className="relative hidden flex-1 sm:block"
        >
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search player, card, set, year…"
            aria-label="Search listings"
            className="w-full rounded-lg border border-line bg-elevated py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-gold focus:outline-none"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-ink-dim md:flex" aria-label="Primary">
          <Link href="/browse" className="transition-colors hover:text-ink">Browse</Link>
          <Link href="/browse?format=auction" className="transition-colors hover:text-ink">Auctions</Link>
        </nav>

        <Link
          href="/sell"
          className="hidden items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim sm:flex"
        >
          <Store size={15} />
          Sell
        </Link>

        <button type="button" onClick={() => router.push("/login")} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line-hv hover:bg-raised">
          Sign in
        </button>
      </div>
    </header>
  );
}
