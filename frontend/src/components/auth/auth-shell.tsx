import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-center font-display text-3xl text-ink">{title}</h1>
      <p className="mt-2 text-center text-sm text-ink-dim">{subtitle}</p>

      <div className="mt-8 rounded-2xl border border-line bg-elevated p-7 shadow-card">{children}</div>

      <p className="mt-6 text-center text-sm text-ink-dim">{footer}</p>
      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
        By continuing you agree to the Atlas{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-gold">Terms</Link> and{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-gold">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-base px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

export const btnCls =
  "w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim disabled:opacity-40";
