"use client";

import Link from "next/link";
import { useState } from "react";
import { CardImage } from "@/components/cards/card-image";
import { conditionChip } from "@/components/cards/listing-card";
import { buttonPrimary } from "@/components/ui/button-styles";
import { GameLine } from "@/components/ui/game-line";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { cardSubtitle, formatPeso } from "@atlas/api";
import type { StoreTab } from "@/lib/store-tabs";
import type { Listing } from "@atlas/api";

/** Store tabs (New and trending, Ending soon): ranked rows with a preview panel on the web. */
export function StoreTabs({ tabs }: { tabs: StoreTab[] }) {
  const [active, setActive] = useState<string>(tabs[0].id);
  const [preview, setPreview] = useState(0);

  return (
    <Tabs
      value={active}
      onValueChange={(v) => {
        setActive(v);
        setPreview(0);
      }}
      className="gap-4"
    >
      <TabsList variant="line" aria-label="Store lists" className="no-scrollbar -mx-4 h-auto w-auto justify-start gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="t-title-2-phone h-11 flex-none rounded-full px-4 uppercase text-ink-dim after:hidden hover:text-ink data-active:bg-raised data-active:text-ink md:t-title-2 dark:data-active:border-transparent dark:data-active:bg-raised"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
          <ol className="flex flex-col gap-1">
            {t.listings.map((l, i) => (
              <li key={l.id} onPointerEnter={() => setPreview(i)} onFocus={() => setPreview(i)}>
                <ListingRow listing={l} rank={i + 1} active={i === preview} />
              </li>
            ))}
          </ol>
          <aside aria-label="Preview" className="hidden md:block">
            <ListingPreview listing={t.listings[preview] ?? t.listings[0]} />
          </aside>
        </TabsContent>
      ))}
    </Tabs>
  );
}

const rowCls = (active: boolean) =>
  cn("flex min-h-16 items-center gap-3 rounded-[12px] px-3 py-2 transition-colors duration-[180ms]", active ? "bg-raised" : "hover:bg-hover-wash");
const chipCls = "t-label inline-flex h-[22px] w-fit items-center rounded-full border px-2 uppercase";

function ListingRow({ listing, rank, active }: { listing: Listing; rank: number; active: boolean }) {
  return (
    <Link href={`/listing/${listing.id}`} className={rowCls(active)}>
      <span className="t-mono w-5 shrink-0 text-ink-faint">{rank}</span>
      <span className="relative aspect-[63/88] w-10 shrink-0 overflow-hidden rounded-md border border-well-line bg-well">
        <CardImage listing={listing} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold text-ink">{listing.title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-dim">
          <GameLine slug={listing.category} />
          <span className="truncate">{cardSubtitle(listing)}</span>
        </span>
      </span>
      <span className="t-price shrink-0 text-ink">{formatPeso(listing.currentBid ?? listing.price)}</span>
    </Link>
  );
}

function ListingPreview({ listing }: { listing: Listing }) {
  const chip = conditionChip(listing);
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-elevated p-5">
      <div className="relative mx-auto aspect-[63/88] w-full max-w-[240px] overflow-hidden rounded-[12px] border border-well-line bg-well">
        <CardImage listing={listing} large />
      </div>
      <GameLine slug={listing.category} className="text-sm text-ink-dim" />
      <p className="line-clamp-2 text-lg font-semibold text-ink">{listing.title}</p>
      {chip && <span className={cn(chipCls, chip.cls)}>{chip.label}</span>}
      <p className="t-price-lg text-ink">{formatPeso(listing.currentBid ?? listing.price)}</p>
      <p className="text-sm text-ink-dim">Sold by {listing.sellerName}</p>
      <Link href={`/listing/${listing.id}`} className={buttonPrimary}>
        View listing
      </Link>
    </div>
  );
}

