"use client";

import type { CSSProperties } from "react";
import { gameColor } from "@/lib/categories";
import { useCategories } from "@/lib/categories-context";
import { cn } from "@/lib/cn";

/** A game's colour dot beside its name: how every mixed context names a game. */
export function GameLine({ slug, className, showName = true }: { slug: string; className?: string; showName?: boolean }) {
  const game = useCategories().find((c) => c.slug === slug);
  const dot = game ? gameColor(game.slug, game.hue) : "var(--color-ink-faint)";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span
        data-game-dot
        aria-hidden="true"
        style={{ "--dot": dot } as CSSProperties}
        className="size-2 shrink-0 rounded-full bg-[color:var(--dot)]"
      />
      {showName && <span className="truncate">{game?.name ?? slug}</span>}
    </span>
  );
}
