import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** An uppercase Unbounded section title (the store convention), with an optional "View all" link. */
export function SectionTitle({ id, children, action }: { id: string; children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="t-title-2-phone uppercase text-ink md:t-title-2">
        {children}
      </h2>
      {action && (
        <Link href={action.href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-ink-dim transition-colors hover:text-ink">
          {action.label}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
    </div>
  );
}
