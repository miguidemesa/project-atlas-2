import Link from "next/link";
import { buttonPrimary } from "@/components/ui/button-styles";

/** A hub with nothing for sale invites the first seller instead of showing empty shelves. */
export function EmptyHub({ name }: { name: string }) {
  return (
    <section className="mt-10 flex flex-col items-start gap-4 rounded-[16px] border border-dashed border-[color:var(--skin-line-strong)] bg-[color:var(--skin-surface)] p-8">
      <h2 className="t-title-1-phone text-ink md:t-title-1">Be the first to sell {name} cards</h2>
      <p className="max-w-xl text-[15px] text-[color:var(--skin-text)]">Nobody has listed a {name} card yet. List yours and it leads this page.</p>
      <Link href="/sell" className={buttonPrimary}>Sell a card</Link>
    </section>
  );
}
