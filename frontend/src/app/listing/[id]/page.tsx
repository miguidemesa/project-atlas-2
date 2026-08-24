import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Gallery } from "@/components/listing/gallery";
import { BidBox } from "@/components/listing/bid-box";
import { SellerTrust } from "@/components/listing/seller-trust";
import { PriceChart } from "@/components/charts/price-chart";
import { DealBadge } from "@/components/cards/deal-badge";
import { ListingCard } from "@/components/cards/listing-card";
import { fetchListing, fetchFeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { listing } = (await fetchListing((await params).id)) ?? {};
  return { title: listing?.title ?? "Listing not found" };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await fetchListing((await params).id);
  if (!data) notFound();
  const { listing, seller, history } = data;

  const details: [string, string][] = [
    ["Year", String(listing.year)],
    ["Set", listing.set],
    ...(listing.parallel ? [["Parallel", listing.parallel] as [string, string]] : []),
    ...(listing.numbered ? [["Serial", listing.serialNumber ?? "—"] as [string, string]] : []),
    ...(listing.graded ? [["Grade", `${listing.gradingCompany} ${listing.gradeValue}`] as [string, string]] : []),
    ["Category", listing.type.replace("_", " ")],
    ["Listed", new Date(listing.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })],
  ];

  const related = (await fetchFeed({ type: listing.type })).filter((l) => l.id !== listing.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Link href="/browse" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-gold">
        <ArrowLeft size={14} /> Back to browse
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div>
          <Gallery listing={listing} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="text-sm text-ink-dim">
              {listing.year} · {listing.set}
              {listing.parallel ? ` · ${listing.parallel}` : ""}
            </p>
            <h1 className="mt-1 font-display text-3xl leading-tight text-ink">{listing.title}</h1>
            <p className="mt-2 font-mono text-xs text-ink-faint">
              {(listing.views ?? 0).toLocaleString()} views · {listing.watchers} watching
            </p>
          </div>

          <div className="rounded-xl border border-line bg-elevated p-5 shadow-card">
            {listing.dealScore && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-raised px-3.5 py-2.5">
                <DealBadge score={listing.dealScore} />
                <span className="text-xs text-ink-dim">
                  vs {`₱${listing.dealScore.medianPhp.toLocaleString("en-PH")}`} median · {listing.dealScore.samples} sales
                </span>
              </div>
            )}
            <BidBox
              price={listing.currentBid ?? listing.price}
              previousPrice={listing.previousPrice}
              format={listing.format}
              bidCount={listing.bidCount}
              endsAt={listing.endsAt}
              watchers={listing.watchers ?? 0}
            />
          </div>

          <SellerTrust seller={seller} />

          <div className="rounded-xl border border-line bg-elevated p-5 shadow-card">
            <PriceChart history={history} />
            <p className="mt-3 font-mono text-[11px] text-ink-faint">Seed market data — illustrative, not live quotes.</p>
          </div>

          <details className="group rounded-xl border border-line bg-elevated open:pb-5">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink marker:hidden hover:text-gold [&::-webkit-details-marker]:hidden">
              Card details & description
            </summary>
            <div className="space-y-5 px-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
                {details.map(([k, v]) => (
                  <div key={k} className="col-span-2 grid grid-cols-subgrid items-baseline">
                    <dt className="text-ink-faint">{k}</dt>
                    <dd className="font-medium text-ink capitalize">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-line pt-4 text-sm leading-relaxed text-ink-dim">{listing.description}</p>
            </div>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="similar">
          <h2 id="similar" className="mb-5 font-display text-2xl text-ink">More like this</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
