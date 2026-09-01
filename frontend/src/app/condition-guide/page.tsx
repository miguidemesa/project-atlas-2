import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Card condition guide",
  description:
    "How Atlas describes raw card condition and what grading grades mean — so you know exactly what arrives at your door.",
};

const RAW_CONDITIONS = [
  {
    name: "Near Mint",
    short: "NM",
    body: "Looks fresh out of the pack at arm's length. No major wear; possibly a single soft corner under close inspection.",
  },
  {
    name: "Lightly Played",
    short: "LP",
    body: "Visible but minor wear — light edge whitening or a couple of small surface scratches that don't jump out.",
  },
  {
    name: "Moderately Played",
    short: "MP",
    body: "Obvious wear from real play or storage: several whitened edges, noticeable scratching, mild bending.",
  },
  {
    name: "Played",
    short: "PL",
    body: "Heavy, honest wear. Creases, heavy scuffing or damage. Priced accordingly — great binder candidates.",
  },
];

const GRADES = [
  { grade: "PSA / BGS 10", label: "Gem Mint", note: "Flawless under magnification. The card everyone quotes prices on." },
  { grade: "9.5", label: "Gem Mint (BGS) / Mint+ ", note: "Barely-perfect; one subgrade a hair off. Strong value versus a 10." },
  { grade: "9", label: "Mint", note: "One small flaw keeps it from gem — often the smart collector's pick." },
  { grade: "8.5–8", label: "Near Mint-Mint", note: "Clear imperfections, still sharp in hand and far cheaper." },
];

export default function ConditionGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Trust & transparency</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">The condition guide.</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-dim">
          Every raw card on Atlas carries one of four conditions, and sellers back them with front, back and
          surface photos. If a card arrives worse than described, escrow has you covered.
        </p>
      </header>

      <section className="mt-12 space-y-4" aria-label="Raw card conditions">
        {RAW_CONDITIONS.map((c) => (
          <div key={c.short} className="flex gap-5 rounded-xl border border-line bg-elevated p-5 shadow-card sm:items-baseline">
            <span className="w-16 shrink-0 rounded-lg border border-line-hv bg-raised py-1 text-center font-mono text-sm font-semibold text-gold">
              {c.short}
            </span>
            <div>
              <h2 className="font-medium text-ink">{c.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-dim">{c.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-14" aria-labelledby="grading-scale">
        <h2 id="grading-scale" className="font-display text-2xl text-ink sm:text-3xl">
          Graded slabs
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Slabbed cards are graded by third parties — the number is theirs, not ours. We verify cert numbers where
          possible and show the label photo so you can judge for yourself.
        </p>
        <dl className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-elevated shadow-card">
          {GRADES.map((g) => (
            <div key={g.grade} className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_120px_1fr] sm:items-baseline sm:gap-4">
              <dt className="font-mono text-sm font-semibold text-gold">{g.grade}</dt>
              <dd className="text-sm font-medium text-ink">{g.label}</dd>
              <dd className="text-sm leading-relaxed text-ink-dim">{g.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 rounded-xl border border-dashed border-line-hv p-6" aria-label="Photo promise">
        <h2 className="font-display text-xl text-ink">The photo promise</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-dim">
          <li>• Every listing shows the exact card — no stock photos for singles.</li>
          <li>• Front, back and a tilted surface shot are the standard.</li>
          <li>• Anything we can&apos;t photograph honestly gets described honestly instead.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-ink-dim">
        Ready to browse with confidence?{" "}
        <Link href="/browse" className="font-medium text-gold hover:underline">
          Head to the market →
        </Link>
      </p>
    </div>
  );
}
