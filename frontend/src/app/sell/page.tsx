import type { Metadata } from "next";
import { SellForm } from "@/components/sell/sell-form";
import { loadCategories } from "@/lib/api";

export const metadata: Metadata = { title: "Sell a card" };
export const dynamic = "force-dynamic";

export default async function SellPage() {
  const categories = await loadCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <header className="mb-10 max-w-lg">
        <h1 className="font-display text-4xl text-ink">List your card.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">
          Any game, any sport. Four steps, a live preview, and escrow that protects you and the buyer on every sale.
        </p>
      </header>
      <SellForm categories={categories} />
    </div>
  );
}
