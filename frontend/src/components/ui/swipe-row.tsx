"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const PAGE_FRACTION = 0.85;

/** A titled row that swipes on phones and pages with arrows on the web; only the row scrolls, never the page. */
export function SwipeRow({ id, title, sub, href, children }: { id: string; title: string; sub?: string; href?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const reduced = usePrefersReducedMotion();
  const page = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * PAGE_FRACTION, behavior: reduced ? "auto" : "smooth" });
  const arrow = "hidden size-11 place-items-center rounded-full border border-line-hv text-ink transition-colors hover:bg-hover-wash md:grid";
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <SectionTitle id={id} action={href ? { href, label: "View all" } : undefined}>{title}</SectionTitle>
          {sub && <p className="-mt-3 mb-4 text-[13px] text-ink-faint">{sub}</p>}
        </div>
        <div className="mb-4 flex gap-2">
          <button type="button" className={arrow} aria-label={`Scroll ${title} left`} onClick={() => page(-1)}><ChevronLeft size={18} strokeWidth={1.75} aria-hidden /></button>
          <button type="button" className={arrow} aria-label={`Scroll ${title} right`} onClick={() => page(1)}><ChevronRight size={18} strokeWidth={1.75} aria-hidden /></button>
        </div>
      </div>
      <ul ref={ref} className="no-scrollbar -mx-4 grid auto-cols-[46%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-3 [scroll-snap-type:x_mandatory] md:mx-0 md:auto-cols-[196px] md:gap-[18px] md:scroll-px-0 md:px-0">
        {children}
      </ul>
    </section>
  );
}
