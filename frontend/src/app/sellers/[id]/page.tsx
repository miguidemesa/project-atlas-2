import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { ListingCard } from "@/components/cards/listing-card";
import { CountUp } from "@/components/ui/count-up";
import { fetchSeller, fetchSellerReviews } from "@/lib/api";
import { formatPeso } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await fetchSeller((await params).id);
  return { title: data ? `${data.seller.displayName} — seller profile` : "Seller not found" };
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await fetchSeller((await params).id);
  if (!data) notFound();
  const { seller, listings } = data;
  const reviews = await fetchSellerReviews(seller.id);

  const totalValue = listings.reduce((sum, l) => sum + (l.currentBid ?? l.price), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-center">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-line bg-elevated font-display text-3xl text-gold shadow-card">
          {seller.displayName[0]}
        </span>

        <div className="flex-1">
          <h1 className="flex items-center gap-2 font-display text-3xl text-ink sm:text-4xl">
            {seller.displayName}
            {seller.verified && <BadgeCheck size={22} className="text-fixed" aria-label="Verified seller" />}
          </h1>
          <p className="mt-1 font-mono text-sm text-ink-faint">@{seller.handle}</p>
          <p className="mt-3 text-sm text-gold" role="img" aria-label={`Rated ${seller.ratingAvg} out of 5 from ${seller.ratingCount} reviews`}>
            {"★".repeat(Math.round(seller.ratingAvg))}
            <span className="text-line-hv">{"★".repeat(5 - Math.round(seller.ratingAvg))}</span>
            <span className="ml-2 text-ink-dim">{seller.ratingAvg.toFixed(1)} · {seller.ratingCount} reviews · member since {seller.joinedYear}</span>
          </p>
        </div>

        <div className="sm:ml-auto">
          <a
            href={`/messages?to=${seller.id}&name=${encodeURIComponent(seller.displayName)}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-base transition-colors hover:bg-gold-dim"
          >
            Message seller
          </a>
        </div>

        <dl className="hidden" aria-hidden>
          {[["Cards live", listings.length], ["Total sold", seller.soldCount], ["Storefront", totalValue]].map(([label, v]) => (
            <div key={label as string}>
              <dd className="font-display text-2xl text-ink">
                {typeof v === "number" && label === "Storefront" ? formatPeso(v) : <CountUp value={v as number} />}
              </dd>
              <dt className="mt-0.5 text-xs uppercase tracking-wider text-ink-faint">{label}</dt>
            </div>
          ))}
        </dl>
      </header>

      <section className="py-10" aria-labelledby="listings">
        <h2 id="listings" className="mb-5 font-display text-2xl text-ink">Live listings</h2>
        {listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-hv p-10 text-center text-sm text-ink-dim">No active listings right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-line pt-10 pb-8" aria-labelledby="reviews">
        <h2 id="reviews" className="mb-5 font-display text-2xl text-ink">Recent reviews</h2>
        {reviews.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-hv p-10 text-center text-sm text-ink-dim">
            No written reviews yet — be the first to trade with {seller.displayName.split(" ")[0]}.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-3">
            {reviews.items.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-elevated p-5">
                <p className="text-sm text-gold" aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-line-hv">{"★".repeat(5 - r.rating)}</span>
                </p>
                {r.content && (
                  <blockquote className="mt-2.5 text-sm leading-relaxed text-ink">{r.content}</blockquote>
                )}
                <footer className="mt-3 font-mono text-xs text-ink-faint">{r.reviewerMasked} · verified order</footer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
