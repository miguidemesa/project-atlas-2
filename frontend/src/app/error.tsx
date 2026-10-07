"use client";

/** Shown when a page can't reach the API. Real data or nothing, never stand-in listings. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-ink-faint">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl text-ink">We couldn’t load the market.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        Atlas can’t reach its servers right now. Your listings and orders are safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 min-h-11 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  );
}
