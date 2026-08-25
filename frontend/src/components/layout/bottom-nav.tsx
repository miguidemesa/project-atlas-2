"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, Home, Package, PlusCircle, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Search", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, primary: true },
  { href: "/browse?format=auction", label: "Auctions", icon: Gavel },
  { href: "/orders", label: "Orders", icon: Package },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-base/90 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === (href.split("?")[0] || "/");
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                primary ? "-translate-y-3" : active ? "text-gold" : "text-ink-dim",
                !primary && !active && "hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full",
                  primary && "h-12 w-12 bg-gold text-ink shadow-lifted",
                )}
              >
                <Icon size={primary ? 22 : 20} />
              </span>
              {!primary && label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
