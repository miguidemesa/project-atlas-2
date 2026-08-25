"use client";

import { useEffect, useRef } from "react";
import { recordAffinityEvent } from "@/lib/affinity";
import type { Category, Listing } from "@/lib/types";

const RECENT_KEY = "atlas-recent.v1";
export const MAX_RECENT = 10;

export interface RecentSnapshot {
  id: string;
  title: string;
  player: string;
  category: Category;
  price: number;
  imageUrl?: string;
  at: number;
}

export function pushRecent(listing: Listing) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    let list: RecentSnapshot[] = raw ? JSON.parse(raw) : [];
    list = list.filter((r) => r.id !== listing.id);
    list.unshift({
      id: listing.id,
      title: listing.title,
      player: listing.player,
      category: listing.category,
      price: listing.currentBid ?? listing.price,
      imageUrl: listing.imageUrl,
      at: Date.now(),
    });
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* private mode */
  }
}

export function getRecent(): RecentSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Records a detail-page view into both affinity + recently-viewed. */
export function ViewTracker({ listing }: { listing: Listing }) {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordAffinityEvent(listing.category, "view");
    pushRecent(listing);
  }, [listing]);
  return null;
}
