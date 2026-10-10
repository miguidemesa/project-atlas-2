import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Gallery } from "@/components/listing/gallery";
import { BidBox } from "@/components/listing/bid-box";
import { SellerTrust } from "@/components/listing/seller-trust";
import { PriceChart } from "@/components/charts/price-chart";
import { DealBadge } from "@/components/cards/deal-badge";
import { ListingCard, conditionChip } from "@/components/cards/listing-card";
import { ViewTracker } from "@/lib/recent";
import { loadFeed, loadListing } from "@/lib/api";
import { cn } from "@/lib/cn";
import { languageName } from "@atlas/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await loadListing((await params).id);
  if (!data) return { title: "Listing not found" };
  const seller = data.seller?.displayName ?? data.listing.sellerName;
  return {
    title: data.listing.title,
    description: `${data.listing.title} — ${seller} on Atlas.`,
    openGraph: {
      title: `${data.listing.title} · Atlas`,
      description: `₱${(data.listing.currentBid ?? data.listing.price).toLocaleString("en-PH")} · ${seller}`,
      images: data.listing.imageUrl ? [{ url: data.listing.imageUrl }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await loadListing((await params).id);
  if (!data) notFound();
  const { listing, seller, history } = data;
  const chip = conditionChip(listing);

  const row = (label: string, value: string): [string, string] => [label, value];
  const details: [string, string][] = [
    ...(listing.year ? [row("Year", String(listing.year))] : []),
    row("Set", listing.set),
    ...(listing.cardNumber ? [row("Card number", listing.cardNumber)] : []),
    ...(listing.language !== "en" ? [row("Language", languageName(listing.language))] : []),
    ...(listing.parallel ? [row("Parallel or rarity", listing.parallel)] : []),
    ...(listing.numbered && listing.serialNumber ? [row("Serial", listing.serialNumber)] : []),
    ...(listing.graded
      ? [row("Grade", [listing.gradingCompany, listing.gradeValue].filter(Boolean).join(" "))]
      : listing.condition
        ? [row("Condition", listing.condition)]
        : []),
    row("Type", listing.type.replace("_", " ")),
    row("Listed", new Date(listing.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })),
  ];

  // a failed related-listings call hides the section instead of failing the page
  const relatedPage = await loadFeed({ category: listing.category, pageSize: 5 }).catch(() => null);
  const related = (relatedPage?.items ?? []).filter((l) => l.id !== listing.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <ViewTracker listing={listing} />
      <Link href="/browse" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-accent">
        <ArrowLeft size={14} aria-hidden /> Back to browse
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div>
          <Gallery listing={listing} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="text-sm text-ink-dim">{[listing.year, listing.set, listing.parallel].filter(Boolean).join(" · ")}</p>
            <div className="mt-1 flex flex-wrap items-start gap-x-3 gap-y-2">
              <h1 className="font-display text-3xl leading-tight text-ink">{listing.title}</h1>
              {chip && (
                <span
                  className={cn(
                    "mt-1.5 inline-flex h-[26px] shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-xs font-bold uppercase tracking-wider",
                    chip.cls,
                  )}
                >
                  {chip.label}
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-xs text-ink-faint">{listing.views.toLocaleString()} views</p>
          </div>

          {listing.status === "sold" ? (
            <div className="rounded-xl border border-accent/50 bg-elevated p-5 text-center shadow-card">
              <p className="font-display text-2xl tracking-wider text-accent">SOLD</p>
              <p className="mt-1.5 text-sm text-ink-dim">This card found its home.</p>
              <Link
                href={`/browse?category=${listing.category}`}
                className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Find a similar card
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-elevated p-5 shadow-card">
              {listing.dealScore && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-raised px-3.5 py-2.5">
                  <DealBadge score={listing.dealScore} />
                  <span className="text-xs text-ink-dim">
                    vs ₱{listing.dealScore.medianPhp.toLocaleString("en-PH")} median · {listing.dealScore.samples} sales
                  </span>
                </div>
              )}
              <BidBox
                listingId={listing.id}
                price={listing.currentBid ?? listing.price}
                format={listing.format}
                bidCount={listing.bidCount ?? undefined}
                endsAt={listing.endsAt ?? undefined}
              />
            </div>
          )}

          {seller && <SellerTrust seller={seller} />}

          {history.length >= 3 && (
            <div className="rounded-xl border border-line bg-elevated p-5 shadow-card">
              <PriceChart history={history} />
              <p className="mt-3 font-mono text-[11px] text-ink-faint">Paid sales on Atlas.</p>
            </div>
          )}

          <details className="group rounded-xl border border-line bg-elevated open:pb-5">
            <summary className="min-h-11 cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink marker:hidden hover:text-accent [&::-webkit-details-marker]:hidden">
              Card details & description
            </summary>
            <div className="space-y-5 px-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
                {details.map(([k, v]) => (
                  <div key={k} className="col-span-2 grid grid-cols-subgrid items-baseline">
                    <dt className="text-ink-faint">{k}</dt>
                    <dd className="font-medium capitalize text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {listing.description && (
                <p className="border-t border-line pt-4 text-sm leading-relaxed text-ink-dim">{listing.description}</p>
              )}
              {!listing.graded && listing.condition && (
                <p className="text-xs">
                  <Link href="/condition-guide" className="inline-flex min-h-11 items-center text-accent hover:underline">
                    What does {listing.condition} mean? →
                  </Link>
                </p>
              )}
            </div>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="similar">
          <h2 id="similar" className="mb-5 font-display text-2xl text-ink">
            More like this
          </h2>
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
