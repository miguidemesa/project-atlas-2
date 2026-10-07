"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { isStorePage, STORE_LINKS } from "@/lib/store-nav";

/** The 52px store bar on store pages (sections + search); on phones a search pill and swipeable chips. */
export function StoreBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  if (!isStorePage(pathname)) return null;

  const search = (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/browse?q=${encodeURIComponent(q.trim())}` : "/browse");
      }}
      className="relative w-full md:w-56 lg:w-80"
    >
      <Search size={18} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cards, sets, players"
        aria-label="Search listings"
        className="h-12 w-full rounded-full border border-line-hv bg-base pl-11 pr-4 text-base text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none md:h-10 md:text-sm"
      />
    </form>
  );

  return (
    <div className="border-b border-line bg-elevated">
      <div className="mx-auto max-w-[1440px] px-4 py-3 md:flex md:h-[52px] md:items-center md:gap-4 md:px-8 md:py-0 xl:px-20">
        <div className="md:order-2 md:ml-auto">{search}</div>
        <nav aria-label="Store" className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:mt-0 md:min-w-0 md:flex-1 md:gap-1 md:px-0">
          {STORE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex h-11 shrink-0 items-center">
              <span className="inline-flex h-9 items-center rounded-full border border-line-hv px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-hover-wash hover:text-ink md:border-transparent md:px-3 md:text-sm md:font-medium md:text-ink-dim">
                {l.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
