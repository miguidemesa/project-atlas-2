"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { buttonGhost, buttonPrimary } from "@/components/ui/button-styles";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { GamesMenu } from "./games-menu";

const navItem = (active: boolean) =>
  cn(
    "inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium transition-colors duration-[180ms]",
    active ? "bg-raised text-ink" : "text-ink-dim hover:text-ink",
  );

/** The 60px Chrome bar on every page (56px on phones): wordmark, Store, Games, Sell a card, account. */
export function GlobalBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="bg-chrome">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 md:h-[60px] md:gap-3 md:px-8 xl:px-20">
        <Link href="/" aria-label="Atlas home" className="t-wordmark mr-2 inline-flex min-h-11 items-center text-ink">
          ATLAS
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={navItem(pathname === "/")}>
            Store
          </Link>
          <GamesMenu triggerClassName={navItem(pathname === "/categories" || pathname.startsWith("/c/"))} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/sell" className={cn(buttonPrimary, "hidden h-10 md:inline-flex")}>
            Sell a card
          </Link>
          {user ? (
            <>
              <span title={user.email} aria-hidden className="flex size-9 items-center justify-center rounded-full bg-avatar font-display text-sm text-ink">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                aria-label="Sign out"
                className="inline-flex size-11 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-hover-wash hover:text-ink"
              >
                <LogOut size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </>
          ) : (
            <Link href="/login" className={cn(buttonGhost, "h-10")}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
