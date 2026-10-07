"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Plus, Search, Store, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Store", icon: Store, active: (p: string) => p === "/" },
  { href: "/browse", label: "Search", icon: Search, active: (p: string) => p === "/browse" },
  { href: "/sell", label: "Sell", icon: Plus, active: (p: string) => p === "/sell", primary: true },
  { href: "/messages", label: "Inbox", icon: MessageSquare, active: (p: string) => p.startsWith("/messages") },
  { href: "/orders", label: "Me", icon: User, active: (p: string) => p.startsWith("/orders") }, // Me opens orders until P6
];

/** The phone's 72px tab bar on the home indicator's safe area. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-chrome pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid h-[72px] max-w-md grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, active, primary }) => {
          const current = active(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  current ? "text-ink before:absolute before:top-0 before:h-0.5 before:w-8 before:rounded-full before:bg-accent" : "text-ink-dim",
                )}
              >
                <span className={cn("flex items-center justify-center", primary && "h-8 w-12 rounded-full bg-accent text-on-accent")}>
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
