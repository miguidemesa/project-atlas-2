"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GameLine } from "@/components/ui/game-line";
import { useCategories } from "@/lib/categories-context";
import { cn } from "@/lib/cn";
import { gamesMenuSections } from "@/lib/store-nav";

/** The global bar's Games menu (Radix: arrow keys, Escape, focus return): every game grouped, linking to its hub. */
export function GamesMenu({ triggerClassName }: { triggerClassName: string }) {
  const sections = gamesMenuSections(useCategories());
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={cn(triggerClassName, "group gap-1")}>
        Games
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden className="transition-transform duration-[180ms] group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[min(760px,calc(100vw-2rem))] rounded-[16px] border-line bg-elevated p-4 shadow-pop">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
          {sections.map((s) => (
            <DropdownMenuGroup key={s.label}>
              <DropdownMenuLabel className="t-label px-2 uppercase text-ink-faint">{s.label}</DropdownMenuLabel>
              {s.items.map((item) => (
                <DropdownMenuItem key={item.slug} asChild className="min-h-9 justify-between gap-3 rounded-lg px-2 text-ink-soft focus:text-ink">
                  <Link href={item.href}>
                    <GameLine slug={item.slug} />
                    {item.count !== null && <span className="t-mono text-ink-faint">{item.count}</span>}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </div>
        {sections.length > 0 && <DropdownMenuSeparator className="my-3 bg-line" />}
        <DropdownMenuItem asChild className="min-h-11 rounded-lg px-2 font-semibold text-accent focus:text-accent-hover">
          <Link href="/categories">All games</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
