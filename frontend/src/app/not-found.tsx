import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Off the court.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        This listing was pulled, sold, or never existed. The market moves fast.
      </p>
      <Link href="/browse" className="mt-8 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim">
        Back to browse
      </Link>
    </div>
  );
}
