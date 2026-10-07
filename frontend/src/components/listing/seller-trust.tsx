import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { SellerSummary } from "@/lib/types";

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-accent" role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {"★".repeat(Math.round(value))}
      <span className="text-line-hv">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export function SellerTrust({ seller }: { seller: SellerSummary }) {
  return (
    <Link
      href={`/sellers/${seller.id}`}
      className="flex items-center gap-4 rounded-xl border border-line bg-elevated p-4 transition-colors hover:border-line-hv"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-raised font-display text-lg text-accent">
        {seller.displayName[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium text-ink">
          {seller.displayName}
          {seller.verified && <BadgeCheck size={15} className="shrink-0 text-fixed" aria-label="Verified seller" />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-dim">
          {seller.ratingAvg === null ? (
            <span>No reviews yet</span>
          ) : (
            <>
              <Stars value={seller.ratingAvg} />
              <span className="font-mono">
                {seller.ratingAvg.toFixed(1)} ({seller.ratingCount})
              </span>
            </>
          )}
          <span>
            · {seller.soldCount} sold · since {seller.joinedYear}
          </span>
        </p>
      </div>
    </Link>
  );
}
