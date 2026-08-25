"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, LogIn, Sparkles } from "lucide-react";
import { CardArt } from "@/components/cards/card-art";
import { useAuth } from "@/lib/auth";
import { createListing, scanCard, uploadListingPhoto } from "@/lib/api";
import { cn } from "@/lib/cn";

const STEPS = ["The card", "Condition", "Photos", "Format & price"] as const;

const schema = z.object({
  category: z.enum(["nba", "pokemon", "one_piece", "disney"]),
  player: z.string().min(2, "Who is on the card?"),
  year: z.number({ message: "Enter a 4-digit year" }).min(1996).max(new Date().getFullYear()),
  set: z.string().min(2, "Which set is it from?"),
  parallel: z.string().optional(),
  condition: z.string().optional(),
  graded: z.boolean(),
  gradingCompany: z.string().optional(),
  gradeValue: z.string().optional(),
  format: z.enum(["fixed", "auction"]),
  price: z.number({ message: "Set a price of at least ₱100" }).min(100, "Minimum ₱100"),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

type PhotoSlotKey = "front" | "back" | "surface";

const PHOTO_SLOTS: { key: PhotoSlotKey; label: string; hint: string; required?: boolean }[] = [
  { key: "front", label: "Front", hint: "Full card face, straight-on, good light", required: true },
  { key: "back", label: "Back", hint: "Card back — buyers always ask" },
  { key: "surface", label: "Surface", hint: "Tilted close-up catching the light" },
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-urgent">
          {error}
        </p>
      )}
    </div>
  );
}

export function SellForm() {
  const [step, setStep] = useState(0);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [stepError, setStepError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlotKey, File>>>({});
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<string>("");
  const previewUrls = useRef<string[]>([]);

  const { user, authFetch } = useAuth();

  const [watched, setWatched] = useState<FormValues>({
    category: "nba",
    player: "",
    year: new Date().getFullYear() - 1,
    set: "",
    parallel: "",
    graded: false,
    gradingCompany: undefined,
    gradeValue: undefined,
    format: "fixed",
    price: 2500,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: watched,
    mode: "onTouched",
  });

  watch((v) =>
    setWatched((prev) => ({
      ...prev,
      ...v,
      year: Number(v.year) || prev.year,
      price: Number(v.price) || prev.price,
    })),
  );

  // clean up object URLs
  useEffect(() => () => previewUrls.current.forEach(URL.revokeObjectURL), []);

  function setPhoto(slot: PhotoSlotKey, file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStepError("Only JPEG, PNG or WebP images are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStepError("Photos must be 5 MB or smaller.");
      return;
    }
    setStepError("");
    setPhotos((p) => ({ ...p, [slot]: file }));
  }

  function goNext() {
    if (step === 0 && (!watched.player.trim() || !watched.set.trim())) {
      setStepError("Fill in the player and set before continuing.");
      return;
    }
    if (step === 2 && !photos.front) {
      setStepError("A front photo is required — buyers buy with their eyes.");
      return;
    }
    setStepError("");
    setStep((s) => s + 1);
  }

  async function onSubmit(values: FormValues) {
    setSubmitError("");
    if (!user) {
      setSubmitError("Please sign in first so the listing belongs to your account.");
      return;
    }
    setUploading(true);
    const result = await createListing(
      {
        category: values.category,
        player: values.player,
        team: values.category === "nba" ? "—" : values.category,
        year: values.year,
        set: values.set,
        parallel: values.parallel || undefined,
        graded: values.graded,
        gradingCompany: values.gradingCompany,
        gradeValue: values.gradeValue,
        type: "single_card",
        format: values.format,
        price: values.price,
        endsInHours: values.format === "auction" ? 72 : undefined,
      },
      authFetch,
    );

    if (!result.ok) {
      setSubmitError(result.error);
      setUploading(false);
      return;
    }

    for (const slot of PHOTO_SLOTS) {
      const file = photos[slot.key];
      if (!file) continue;
      const up = await uploadListingPhoto(result.id, file, authFetch);
      if (!up.ok) {
        setSubmitError(`Listing created, but ${slot.label} photo failed: ${up.error}`);
        setSubmittedId(result.id);
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setSubmittedId(result.id);
  }

  const previewSeed = `${watched.player}-${watched.year}-${watched.set}`.toLowerCase().replace(/\s+/g, "-") || "preview";

  if (submittedId) {
    return (
      <div className="rounded-2xl border border-line bg-elevated p-10 text-center shadow-card">
        <CheckCircle2 size={40} className="mx-auto text-confirmed" />
        <h2 className="mt-4 font-display text-2xl text-ink">Listing is live</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-dim">
          Your card is in front of every collector in the country. Escrow protects you and the buyer.
        </p>
        <Link
          href={`/listing/${submittedId}`}
          className="mt-6 inline-block rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base transition-colors hover:bg-gold-dim"
        >
          View listing
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-hv p-12 text-center">
        <LogIn size={28} className="text-gold" />
        <h2 className="mt-4 font-display text-2xl text-ink">Sign in to start selling</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-dim">
          Listings belong to a verified account so buyers know exactly who they&apos;re trading with.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-gold hover:text-gold">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-base hover:bg-gold-dim">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const previewListing = {
    id: `preview-${previewSeed}`,
    title: `${watched.player} ${watched.year} ${watched.set}`,
    player: watched.player || "Player Name",
    team: "San Antonio Spurs",
    year: Number(watched.year) || 2024,
    set: watched.set || "Prizm",
    parallel: watched.parallel || undefined,
    graded: watched.graded,
    gradingCompany: watched.gradingCompany,
    gradeValue: watched.gradeValue,
    type: "single_card" as const,
    category: watched.category,
    format: watched.format,
    price: Number(watched.price) || 0,
    createdAt: new Date().toISOString(),
    sellerId: "s1",
    description: "",
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-line bg-elevated p-6 shadow-card sm:p-8">
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                  i < step ? "bg-confirmed/20 text-confirmed" : i === step ? "bg-gold text-base" : "bg-raised text-ink-faint",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("hidden text-xs sm:block", i === step ? "font-medium text-ink" : "text-ink-faint")}>{label}</span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-confirmed/50" : "bg-line")} />}
            </li>
          ))}
        </ol>

        {/* STEP 1 */}
        <div className={cn(step !== 0 && "hidden")} role="group" aria-label="Step 1: The card">
          <div className="mb-5 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <span className="text-sm font-medium text-ink">Scan the card</span>
              <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">beta</span>
            </div>
            <p className="mt-1 text-xs text-ink-dim">
              Upload a clear photo and Atlas fills in the details for you.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-line bg-base px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-gold">
                Choose photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setScanBusy(true);
                    setScanResult("");
                    const r = await scanCard(file, authFetch);
                    setScanBusy(false);
                    if (!r.ok) {
                      setScanResult(r.error);
                      return;
                    }
                    const sc = r.scan;
                    if (sc.player) setValue("player", sc.player);
                    if (sc.set) setValue("set", sc.set);
                    if (sc.year) setValue("year", sc.year);
                    if (sc.parallel) setValue("parallel", sc.parallel);
                    setScanResult(`Identified ${sc.player ?? "?"} · ${Math.round(sc.confidence * 100)}%${sc.isMock ? " (demo mode)" : ""}`);
                  }}
                />
              </label>
              {scanBusy && <span className="font-mono text-xs text-ink-faint">Scanning…</span>}
            </div>
            {scanResult && (
              <p role="status" className="mt-2 text-xs text-gold">{scanResult}</p>
            )}
          </div>

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
            <Field label="Player / character" error={errors.player?.message}>
              <input {...register("player")} placeholder="e.g. Victor Wembanyama" className={inputCls} />
            </Field>
            <Field label="Year" error={errors.year?.message}>
              <input {...register("year", { valueAsNumber: true })} inputMode="numeric" placeholder="2023" className={cn(inputCls, "font-mono")} />
            </Field>
            <Field label="Set" error={errors.set?.message}>
              <input {...register("set")} placeholder="Prizm, Surging Sparks…" className={inputCls} />
            </Field>
            <Field label="Parallel (optional)">
              <input {...register("parallel")} placeholder="Silver, SIR, Enchanted…" className={inputCls} />
            </Field>
          </div>
        </div>

        {/* STEP 2 */}
        <div className={cn(step !== 1 && "hidden")} role="group" aria-label="Step 2: Condition">
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors hover:border-line-hv has-checked:border-gold">
            <input type="checkbox" {...register("graded")} className="mt-0.5 h-4 w-4 accent-[#b08d3e]" />
            <span>
              <span className="block text-sm font-medium text-ink">Professionally graded</span>
              <span className="block text-xs text-ink-dim">Slabbed by PSA, BGS or SGC</span>
            </span>
          </label>

          {watch("graded") ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Grading company">
                <select {...register("gradingCompany")} defaultValue="PSA" className={inputCls}>
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS</option>
                  <option value="SGC">SGC</option>
                </select>
              </Field>
              <Field label="Grade">
                <select {...register("gradeValue")} defaultValue="10" className={inputCls}>
                  {["10", "9.5", "9", "8.5", "8"].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
            <Field label="Condition">
              <select {...register("condition")} defaultValue="Near Mint" className={inputCls}>
                {["Near Mint", "Lightly Played", "Moderately Played", "Played"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* STEP 3 */}
        <div className={cn(step !== 2 && "hidden")} role="group" aria-label="Step 3: Photos">
          <p className="mb-4 text-sm text-ink-dim">
            Real photos sell. Neutral background, steady hand — the front photo becomes your tile.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PHOTO_SLOTS.map((slot) => (
              <label
                key={slot.key}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-hv p-4 text-center transition-colors hover:border-gold has-[img]:border-solid has-[img]:border-line",
                )}
              >
                {photos[slot.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(photos[slot.key]!)} alt={`${slot.label} preview`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                ) : (
                  <ImagePlus size={22} className="mt-2 text-ink-faint" />
                )}
                <span className="text-sm font-medium text-ink">
                  {slot.label}
                  {slot.required && <span className="ml-1 text-urgent">*</span>}
                </span>
                <span className="text-[11px] leading-snug text-ink-faint">{slot.hint}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => setPhoto(slot.key, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>
          {!photos.front && <p className="mt-3 text-xs text-ink-faint">Front photo required before publishing.</p>}
        </div>

        {/* STEP 4 */}
        <div className={cn(step !== 3 && "hidden")} role="group" aria-label="Step 4: Format and price">
          <div className="mb-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Listing format">
            {([
              ["fixed", "Buy now", "Set your price"],
              ["auction", "Auction", "Live for 72 hours"],
            ] as const).map(([v, title, sub]) => (
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

        {(stepError || submitError) && (
          <p role="alert" className="mt-4 rounded-lg bg-urgent/10 px-3.5 py-2.5 text-xs text-urgent">
            {stepError || submitError}
          </p>
        )}

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
              onClick={goNext}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base transition-colors hover:bg-gold-dim"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base transition-colors hover:bg-gold-dim disabled:opacity-50"
            >
              {uploading ? "Publishing…" : "Publish listing"}
            </button>
          )}
        </div>
      </form>

      <aside className="order-first lg:order-none" aria-label="Live preview">
        <p className="mb-4 text-center font-mono text-xs uppercase tracking-wider text-ink-faint">Live preview</p>
        <div className="mx-auto w-full max-w-[260px]">
          <div className="overflow-hidden rounded-xl border border-line shadow-lifted">
            <div className="aspect-[3/4]">
              <CardArt listing={previewListing} />
            </div>
          </div>
          <p className="mt-3 text-center font-display text-xl text-gold">
            ₱{Number(watched.price || 0).toLocaleString("en-PH")}
          </p>
        </div>
      </aside>
    </div>
  );
}
