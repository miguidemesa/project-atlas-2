"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { CardArt } from "@/components/cards/card-art";
import { cn } from "@/lib/cn";

const STEPS = ["The card", "Condition", "Format & price"] as const;

const schema = z.object({
  category: z.enum(["nba", "pokemon", "one_piece", "disney"]),
  player: z.string().min(2, "Who is on the card?"),
  year: z.number({ message: "Enter a 4-digit year" }).min(1996).max(new Date().getFullYear()),
  set: z.string().min(2, "Which set is it from?"),
  parallel: z.string().optional(),
  graded: z.boolean(),
  gradingCompany: z.string().optional(),
  gradeValue: z.string().optional(),
  format: z.enum(["fixed", "auction"]),
  price: z.number({ message: "Set a price of at least ₱100" }).min(100, "Minimum ₱100"),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

export function SellForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [watched, setWatched] = useState<FormValues>({
    category: "nba",
    player: "", year: new Date().getFullYear() - 1, set: "", parallel: "",
    graded: false, gradingCompany: undefined, gradeValue: undefined, format: "fixed", price: 2500,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: watched,
    mode: "onTouched",
  });

  watch((v) => setWatched((prev) => ({ ...prev, ...v, year: Number(v.year) || prev.year, price: Number(v.price) || prev.price })));

  const preview = (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="overflow-hidden rounded-xl border border-line shadow-lifted">
        <div className="aspect-[3/4]">
          <CardArt
            listing={{
              id: `preview-${previewSeed(watched)}`,
              title: `${watched.player} ${watched.year} ${watched.set}`,
              player: watched.player || "Player Name",
              team: "San Antonio Spurs",
              year: Number(watched.year) || 2024,
              set: watched.set || "Prizm",
              parallel: watched.parallel || undefined,
              graded: watched.graded,
              gradingCompany: watched.gradingCompany,
              gradeValue: watched.gradeValue,
              type: "single_card",
              category: watched.category,
              format: watched.format,
              price: Number(watched.price) || 0,
              views: 0,
              watchers: 0,
              createdAt: new Date().toISOString(),
              sellerId: "s1",
              description: "",
            }}
          />
        </div>
      </div>
      <p className="mt-3 text-center font-display text-xl text-gold">₱{Number(watched.price || 0).toLocaleString("en-PH")}</p>
    </div>
  );

  if (submitted) {
    return (
      <div className="rounded-2xl border border-line bg-elevated p-10 text-center shadow-card">
        <CheckCircle2 size={40} className="mx-auto text-confirmed" />
        <h2 className="mt-4 font-display text-2xl text-ink">Listing queued</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-dim">
          Your {watched.player || "card"} listing is being reviewed against marketplace rules and goes live within minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form
        onSubmit={handleSubmit(() => setSubmitted(true))}
        className="rounded-2xl border border-line bg-elevated p-6 shadow-card sm:p-8"
      >
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                  i < step ? "bg-confirmed/20 text-confirmed" : i === step ? "bg-gold text-ink" : "bg-raised text-ink-faint",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("hidden text-xs sm:block", i === step ? "font-medium text-ink" : "text-ink-faint")}>{label}</span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-confirmed/50" : "bg-line")} />}
            </li>
          ))}
        </ol>

        <div className={cn(step !== 0 && "hidden")} role="group" aria-label="Step 1: The card">
          <div className="mb-4">
            <Field label="Category">
              <select {...register("category")} className={inputCls}>
                <option value="nba">NBA / basketball</option>
                <option value="pokemon">Pokémon</option>
                <option value="one_piece">One Piece</option>
                <option value="disney">Disney & Lorcana</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Player" error={errors.player?.message}>
              <input {...register("player")} placeholder="e.g. Victor Wembanyama" className={inputCls} />
            </Field>
            <Field label="Year" error={errors.year?.message}>
              <input {...register("year", { valueAsNumber: true })} inputMode="numeric" placeholder="2023" className={cn(inputCls, "font-mono")} />
            </Field>
            <Field label="Set" error={errors.set?.message}>
              <input {...register("set")} placeholder="Prizm, Select, Crown Royale…" className={inputCls} />
            </Field>
            <Field label="Parallel (optional)">
              <input {...register("parallel")} placeholder="Silver, Gold /10…" className={inputCls} />
            </Field>
          </div>
        </div>

        <div className={cn(step !== 1 && "hidden")} role="group" aria-label="Step 2: Condition">
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors hover:border-line-hv has-checked:border-gold">
            <input type="checkbox" {...register("graded")} className="mt-0.5 h-4 w-4 accent-[#b08d3e]" />
            <span>
              <span className="block text-sm font-medium text-ink">Professionally graded</span>
              <span className="block text-xs text-ink-dim">Slabbed by PSA, BGS or SGC</span>
            </span>
          </label>

          {watch("graded") && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Field label="Grading company">
                <select {...register("gradingCompany")} className={inputCls}>
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS</option>
                  <option value="SGC">SGC</option>
                </select>
              </Field>
              <Field label="Grade">
                <select {...register("gradeValue")} className={inputCls}>
                  {["10", "9.5", "9", "8.5", "8"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {!watch("graded") && (
            <p className="rounded-lg border border-dashed border-line-hv p-4 text-sm text-ink-dim">
              Raw cards list with a condition note buyers can trust — check corners, edges, surface and centering before you photograph.
            </p>
          )}
        </div>

        <div className={cn(step !== 2 && "hidden")} role="group" aria-label="Step 3: Format and price">
          <div className="mb-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Listing format">
            {([["fixed", "Buy now", "Set your price"], ["auction", "Auction", "Let bids decide"]] as const).map(([v, title, sub]) => (
              <label key={v} className="cursor-pointer rounded-lg border border-line p-4 transition-colors has-checked:border-gold has-checked:bg-gold/5">
                <input type="radio" value={v} {...register("format")} className="sr-only" />
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="block text-xs text-ink-dim">{sub}</span>
              </label>
            ))}
          </div>
          <Field label={watch("format") === "auction" ? "Starting bid (₱)" : "Your price (₱)"} error={errors.price?.message}>
            <input {...register("price", { valueAsNumber: true })} inputMode="numeric" className={cn(inputCls, "font-mono tabular-nums")} />
          </Field>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-ink-dim transition-colors hover:text-ink disabled:opacity-0"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button type="submit" className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dim">
              Publish listing
            </button>
          )}
        </div>
      </form>

      <aside className="order-first lg:order-none" aria-label="Live preview">
        <p className="mb-4 text-center font-mono text-xs uppercase tracking-wider text-ink-faint">Live preview</p>
        {preview}
      </aside>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1.5 text-xs text-urgent">{error}</p>}
    </div>
  );
}

function previewSeed(v: FormValues): string {
  return `${v.player}-${v.year}-${v.set}`.toLowerCase().replace(/\s+/g, "-");
}
