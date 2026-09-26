import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORY_SKINS } from "@/lib/categories";

export function CategoryDoors({ counts }: { counts: Partial<Record<string, number>> }) {
  return (
    <nav aria-label="Shop by category" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CATEGORY_SKINS.map((c) => {
        const count = counts[c.slug] ?? 0;
        return (
          <Link
            key={c.slug}
            href={`/browse?category=${c.slug}`}
            aria-label={`${c.label}, ${count} for sale`}
            className="group relative flex h-[110px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-transform duration-200 ease-out hover:-translate-y-[3px]"
            style={{ background: c.bg, borderColor: c.border }}
          >
            <span className="relative text-xl font-extrabold tracking-tight" style={{ color: c.accent }}>
              {c.label}
            </span>
            <span className="relative flex items-center justify-between text-[13px]" style={{ color: c.countColor }}>
              <span className="tabular-nums">{count.toLocaleString()} for sale</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="absolute inset-x-0 bottom-0 flex h-[5px]">
              {c.bandColors.map((color, i) => (
                <span key={i} className="flex-grow" style={{ background: color }} />
              ))}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
