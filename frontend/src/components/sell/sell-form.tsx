"use client";

import { cloneElement, useEffect, useId, useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Loader2, LogIn, Sparkles } from "lucide-react";
import { CardArt, type CardArtListing } from "@/components/cards/card-art";
import { useAuth } from "@/lib/auth";
import { competingPriceCheck, createListing, type CompetingResult, scanCard, uploadListingPhoto } from "@/lib/api";
import { GROUP_LABELS } from "@/lib/categories";
import { LANGUAGE_OPTIONS } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CategoryInfo } from "@/lib/types";
import { AUCTION_HOURS, CONDITIONS, GRADERS, GRADES, sellSchema, toListingPayload, type SellValues } from "./sell-schema";

const STEPS = ["The card", "Condition", "Photos", "Format & price"] as const;

/** Which step shows each field, so a failed submit jumps to the first problem. */
const STEP_OF: Partial<Record<keyof SellValues, number>> = {
  graded: 1,
  gradingCompany: 1,
  gradeValue: 1,
  condition: 1,
  format: 3,
  endsInHours: 3,
  price: 3,
};

const TYPES = [
  ["single_card", "Single card"],
  ["lot", "Lot of cards"],
  ["hobby_box", "Sealed product"],
  ["accessory", "Supplies"],
] as const;

const GROUPS = ["tcg", "sports", "nonsport"] as const;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COMPETING_DEBOUNCE_MS = 700;

const inputCls =
  "min-h-11 w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold";
const btnPrimary =
  "flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-base transition-colors hover:bg-gold-dim disabled:opacity-60";

type PhotoSlotKey = "front" | "back" | "surface";

const PHOTO_SLOTS: { key: PhotoSlotKey; label: string; hint: string; required?: boolean }[] = [
  { key: "front", label: "Front", hint: "Full card face, straight-on, good light", required: true },
  { key: "back", label: "Back", hint: "Card back — buyers always ask" },
  { key: "surface", label: "Surface", hint: "Tilted close-up catching the light" },
];

const optional = (v: unknown) => (v === "" || v === undefined || v === null ? undefined : v);

type ControlProps = { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/** Label above the control; the error sits below it and is announced and linked to the control. */
function Field({ label, error, children }: { label: string; error?: string; children: ReactElement<ControlProps> }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-urgent">
          {error}
        </p>
      )}
    </div>
  );
}

function buildDefaults(categories: CategoryInfo[]): SellValues {
  const first = categories[0];
  return {
    category: first?.slug ?? "",
    isSports: first?.group === "sports",
    player: "",
    set: "",
    language: "en",
    type: "single_card",
    graded: false,
    condition: "NM",
    format: "fixed",
    endsInHours: 72,
    price: 2500,
  };
}

export function SellForm({ categories }: { categories: CategoryInfo[] }) {
  const [step, setStep] = useState(0);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [stepError, setStepError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlotKey, File>>>({});
  const [scanBusy, setScanBusy] = useState(false);
  const [competingResult, setCompetingResult] = useState<{ key: string; data: CompetingResult } | null>(null);
  const [photoFailures, setPhotoFailures] = useState<Partial<Record<PhotoSlotKey, string>>>({});
  const [retrying, setRetrying] = useState<PhotoSlotKey | null>(null);
  const [scanResult, setScanResult] = useState("");
  const [focusField, setFocusField] = useState<keyof SellValues | null>(null);
  const { user, authFetch } = useAuth();

  const defaults = useMemo(() => buildDefaults(categories), [categories]);
  const sportsSlugs = useMemo(() => new Set(categories.filter((c) => c.group === "sports").map((c) => c.slug)), [categories]);
  // isSports is derived from the chosen category, never held as separate state
  const resolver = useMemo<Resolver<SellValues>>(
    () => (vals, ctx, opts) => zodResolver(sellSchema)({ ...vals, isSports: sportsSlugs.has(vals.category) }, ctx, opts),
    [sportsSlugs],
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<SellValues>({ resolver, defaultValues: defaults, mode: "onTouched" });
  const values = useWatch({ control }) as SellValues;
  const isSports = sportsSlugs.has(values.category);

  // once a failed submit has switched the step, focus the first invalid field
  useEffect(() => {
    if (!focusField) return;
    setFocus(focusField);
    setFocusField(null);
  }, [focusField, step, setFocus]);

  // one object URL per chosen file, revoked when it's replaced
  const photoUrls = useMemo(
    () =>
      Object.fromEntries(Object.entries(photos).map(([slot, file]) => [slot, URL.createObjectURL(file!)])) as Partial<
        Record<PhotoSlotKey, string>
      >,
    [photos],
  );
  useEffect(() => () => Object.values(photoUrls).forEach((url) => url && URL.revokeObjectURL(url)), [photoUrls]);

  // live competition check once the card is identified (needs a year until the catalog ships in P3).
  // The result is tied to the inputs it was fetched for, so it disappears the moment any of them change.
  // The endpoint takes no category or type, so those are part of the key only.
  const { player, set, year, parallel, category, type } = values;
  const competingKey = [category, type, player?.trim(), set?.trim(), year, parallel?.trim()].join("|");
  const canCompare = Boolean(user && type === "single_card" && player?.trim() && set?.trim() && year);
  useEffect(() => {
    if (!canCompare) return;
    const timer = setTimeout(async () => {
      const result = await competingPriceCheck(
        { player: player.trim(), year: year!, set: set.trim(), parallel: parallel?.trim() || undefined },
        authFetch,
      );
      setCompetingResult(result && result.count > 0 ? { key: competingKey, data: result } : null);
    }, COMPETING_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [canCompare, authFetch, player, set, year, parallel, competingKey]);
  const competing = canCompare && competingResult?.key === competingKey ? competingResult.data : null;

  function setPhoto(slot: PhotoSlotKey, file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setStepError("Only JPEG, PNG or WebP images are accepted.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setStepError("Photos must be 5 MB or smaller.");
      return;
    }
    setStepError("");
    setPhotos((p) => ({ ...p, [slot]: file }));
  }

  function goNext() {
    if (step === 0 && (!values.player?.trim() || !values.set?.trim())) {
      setStepError("Fill in the card name and set before continuing.");
      return;
    }
    if (step === 2 && !photos.front) {
      setStepError("A front photo is required — buyers buy with their eyes.");
      return;
    }
    setStepError("");
    setStep((s) => s + 1);
  }

  function onInvalid(fieldErrors: FieldErrors<SellValues>) {
    const fields = Object.keys(fieldErrors) as (keyof SellValues)[];
    if (fields.length === 0) return;
    const stepOf = (f: keyof SellValues) => STEP_OF[f] ?? 0;
    const first = fields.reduce((a, b) => (stepOf(b) < stepOf(a) ? b : a));
    setStepError("");
    setStep(stepOf(first));
    setFocusField(first);
  }

  async function onSubmit(form: SellValues) {
    setSubmitError("");
    if (!user) {
      setSubmitError("Please sign in first so the listing belongs to your account.");
      return;
    }
    if (!photos.front) {
      setStep(2);
      setStepError("A front photo is required — buyers buy with their eyes.");
      return;
    }
    setUploading(true);
    const result = await createListing(toListingPayload(form), authFetch);
    if (!result.ok) {
      setSubmitError(result.error);
      setUploading(false);
      return;
    }

    setSubmittedId(result.id);
    await uploadPhotos(result.id, PHOTO_SLOTS.map((slot) => slot.key));
    setUploading(false);
  }

  /** Tries every slot (a failure doesn't stop the rest) and records which ones failed. */
  async function uploadPhotos(listingId: string, slots: PhotoSlotKey[]) {
    const failures: Partial<Record<PhotoSlotKey, string>> = {};
    for (const key of slots) {
      const file = photos[key];
      if (!file) continue;
      const upload = await uploadListingPhoto(listingId, file, authFetch);
      if (!upload.ok) failures[key] = upload.error ?? "Upload failed.";
    }
    setPhotoFailures((prev) => {
      const next = { ...prev };
      for (const key of slots) delete next[key];
      return { ...next, ...failures };
    });
  }

  async function retryPhoto(key: PhotoSlotKey) {
    if (!submittedId) return;
    setRetrying(key);
    await uploadPhotos(submittedId, [key]);
    setRetrying(null);
  }

  if (submittedId) {
    const failed = PHOTO_SLOTS.filter((slot) => photoFailures[slot.key]);
    return (
      <div className="rounded-2xl border border-line bg-elevated p-10 text-center shadow-card">
        <CheckCircle2 size={40} className="mx-auto text-confirmed" aria-hidden />
        <h2 className="mt-4 font-display text-2xl text-ink">{failed.length ? "Listing created" : "Listing is live"}</h2>
        {failed.length > 0 && (
          <div role="alert" className="mx-auto mt-3 max-w-sm text-left">
            <p className="text-sm text-urgent">
              {failed.length === 1 ? "One photo" : `${failed.length} photos`} didn&apos;t upload. Retry them so buyers can see your card.
            </p>
            <ul className="mt-3 space-y-2">
              {failed.map((slot) => (
                <li key={slot.key} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                  <span className="text-xs text-ink-dim">
                    <span className="block text-sm font-medium text-ink">{slot.label}</span>
                    {photoFailures[slot.key]}
                  </span>
                  <button
                    type="button"
                    onClick={() => retryPhoto(slot.key)}
                    disabled={retrying !== null}
                    className="min-h-11 rounded-lg border border-line px-4 text-xs font-medium text-ink hover:border-gold hover:text-gold disabled:opacity-60"
                  >
                    {retrying === slot.key ? "Retrying…" : "Retry"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href={`/listing/${submittedId}`} className={cn(btnPrimary, "mt-6 inline-flex")}>
          View listing
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-hv p-12 text-center">
        <LogIn size={28} className="text-gold" aria-hidden />
        <h2 className="mt-4 font-display text-2xl text-ink">Sign in to start selling</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-dim">
          Listings belong to an account so buyers know exactly who they&apos;re trading with.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="flex min-h-11 items-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-gold hover:text-gold"
          >
            Sign in
          </Link>
          <Link href="/register" className={cn(btnPrimary, "px-5")}>
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const serial = isSports ? values.serialNumber?.trim() : undefined;
  const preview: CardArtListing = {
    id: `preview-${`${values.player}-${values.set}`.toLowerCase().replace(/\s+/g, "-")}`,
    title: values.player || "Your card",
    category: values.category,
    player: values.player || "Card name",
    team: isSports ? (values.team ?? null) : null,
    year: values.year ?? null,
    set: values.set || "Set",
    parallel: values.parallel || null,
    graded: values.graded,
    gradingCompany: values.gradingCompany ?? null,
    gradeValue: values.gradeValue ?? null,
    numbered: Boolean(serial),
    serialNumber: serial || null,
    type: values.type,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        noValidate
        className="rounded-2xl border border-line bg-elevated p-6 shadow-card sm:p-8"
      >
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

        {/* STEP 1 — the card */}
        <div className={cn(step !== 0 && "hidden")} role="group" aria-label="Step 1: The card">
          <div className="mb-5 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" aria-hidden />
              <span className="text-sm font-medium text-ink">Scan the card</span>
              <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">beta</span>
            </div>
            <p className="mt-1 text-xs text-ink-dim">Upload a clear photo and Atlas fills in what it recognises.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex min-h-11 cursor-pointer items-center rounded-lg border border-line bg-base px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold">
                Choose photo
                <input
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setScanBusy(true);
                    setScanResult("");
                    const scan = await scanCard(file, authFetch);
                    setScanBusy(false);
                    if (!scan.ok) {
                      setScanResult(scan.error);
                      return;
                    }
                    const sc = scan.scan;
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
              <p role="status" className="mt-2 text-xs text-gold">
                {scanResult}
              </p>
            )}
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Field label="Game or sport" error={errors.category?.message}>
              <select
                {...register("category")}
                className={inputCls}
              >
                {GROUPS.map((group) => (
                  <optgroup key={group} label={GROUP_LABELS[group]}>
                    {categories
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="What are you listing?">
              <select {...register("type")} className={inputCls}>
                {TYPES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isSports ? "Player" : "Card or character name"} error={errors.player?.message}>
              <input {...register("player")} placeholder={isSports ? "e.g. Victor Wembanyama" : "e.g. Charizard ex"} className={inputCls} />
            </Field>
            {isSports && (
              <Field label="Team" error={errors.team?.message}>
                <input {...register("team", { setValueAs: optional })} placeholder="e.g. San Antonio Spurs" className={inputCls} />
              </Field>
            )}
            <Field label="Set" error={errors.set?.message}>
              <input {...register("set")} placeholder={isSports ? "Prizm, Select…" : "151, Romance Dawn…"} className={inputCls} />
            </Field>
            <Field label={isSports ? "Year" : "Year (optional)"} error={errors.year?.message}>
              <input
                {...register("year", { setValueAs: (v) => (optional(v) === undefined ? undefined : Number(v)) })}
                inputMode="numeric"
                placeholder="2023"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label="Card number (optional)" error={errors.cardNumber?.message}>
              <input
                {...register("cardNumber", { setValueAs: optional })}
                placeholder={isSports ? "#136" : "199/165, OP05-119…"}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field label={isSports ? "Parallel (optional)" : "Rarity or variant (optional)"} error={errors.parallel?.message}>
              <input
                {...register("parallel", { setValueAs: optional })}
                placeholder={isSports ? "Silver, Gold /10…" : "SIR, Alt Art, Enchanted…"}
                className={inputCls}
              />
            </Field>
            {isSports && (
              <Field label="Serial (optional)" error={errors.serialNumber?.message}>
                <input {...register("serialNumber", { setValueAs: optional })} placeholder="e.g. 07/10" className={cn(inputCls, "font-mono")} />
              </Field>
            )}
            <Field label="Language">
              <select {...register("language")} className={inputCls}>
                {LANGUAGE_OPTIONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description (optional)" error={errors.description?.message}>
              <textarea
                {...register("description", { setValueAs: optional })}
                rows={3}
                placeholder="Centering, corners, where it was pulled…"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* STEP 2 — condition */}
        <div className={cn(step !== 1 && "hidden")} role="group" aria-label="Step 2: Condition">
          <label className="mb-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors hover:border-line-hv has-checked:border-gold">
            <input type="checkbox" {...register("graded")} className="mt-0.5 h-5 w-5 accent-gold" />
            <span>
              <span className="block text-sm font-medium text-ink">Professionally graded</span>
              <span className="block text-xs text-ink-dim">Slabbed by PSA, BGS, CGC, SGC, TAG or ACE</span>
            </span>
          </label>

          {values.graded ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Grading company" error={errors.gradingCompany?.message}>
                <select {...register("gradingCompany", { setValueAs: optional })} className={inputCls}>
                  <option value="">Choose…</option>
                  {GRADERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grade" error={errors.gradeValue?.message}>
                <select {...register("gradeValue", { setValueAs: optional })} className={inputCls}>
                  <option value="">Choose…</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : values.type === "single_card" ? (
            <Field label="Condition" error={errors.condition?.message}>
              <select {...register("condition")} className={inputCls}>
                {CONDITIONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-sm text-ink-dim">
              Sealed product, lots and supplies don’t need a condition grade. Mention anything worth knowing in the description.
            </p>
          )}
        </div>

        {/* STEP 3 — photos */}
        <div className={cn(step !== 2 && "hidden")} role="group" aria-label="Step 3: Photos">
          <p className="mb-4 text-sm text-ink-dim">Real photos sell. Neutral background, steady hand — the front photo becomes your tile.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PHOTO_SLOTS.map((slot) => (
              <label
                key={slot.key}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line-hv p-4 text-center transition-colors hover:border-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold has-[img]:border-solid has-[img]:border-line"
              >
                {photoUrls[slot.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrls[slot.key]} alt={`${slot.label} preview`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                ) : (
                  <ImagePlus size={22} className="mt-2 text-ink-faint" aria-hidden />
                )}
                <span className="text-sm font-medium text-ink">
                  {slot.label}
                  {slot.required && <span className="ml-1 text-urgent">*</span>}
                </span>
                <span className="text-[11px] leading-snug text-ink-faint">{slot.hint}</span>
                <input
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => setPhoto(slot.key, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>
          {!photos.front && <p className="mt-3 text-xs text-ink-faint">Front photo required before publishing.</p>}
        </div>

        {/* STEP 4 — format and price */}
        <div className={cn(step !== 3 && "hidden")} role="group" aria-label="Step 4: Format and price">
          <div className="mb-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Listing format">
            {(
              [
                ["fixed", "Buy now", "Set your price"],
                ["auction", "Auction", "Highest bid wins"],
              ] as const
            ).map(([v, title, sub]) => (
              <label
                key={v}
                className="min-h-11 cursor-pointer rounded-lg border border-line p-4 transition-colors has-checked:border-gold has-checked:bg-gold/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold"
              >
                <input type="radio" value={v} {...register("format")} className="sr-only" />
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="block text-xs text-ink-dim">{sub}</span>
              </label>
            ))}
          </div>

          {values.format === "auction" && (
            <div className="mb-5">
              <Field label="Auction length" error={errors.endsInHours?.message}>
                <select {...register("endsInHours", { setValueAs: (v) => (v ? Number(v) : undefined) })} className={inputCls}>
                  {AUCTION_HOURS.map(([hours, label]) => (
                    <option key={hours} value={hours}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {competing && (
            <div className="mb-5 rounded-xl border border-gold/40 bg-gold/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {competing.count} {competing.count === 1 ? "seller" : "sellers"} already list this card
                </p>
                <span className="font-mono text-xs text-ink-faint">
                  ₱{competing.min.toLocaleString("en-PH")} – ₱{competing.max.toLocaleString("en-PH")}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-dim">
                Their median asking price is <span className="font-semibold text-gold">₱{competing.median.toLocaleString("en-PH")}</span>.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue("price", Math.round(competing.median * 100) / 100, { shouldValidate: true })}
                  className="min-h-11 rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-gold hover:text-gold"
                >
                  Match median · ₱{(Math.round(competing.median * 100) / 100).toLocaleString("en-PH")}
                </button>
                <button
                  type="button"
                  onClick={() => setValue("price", Math.max(1, competing.min - 100), { shouldValidate: true })}
                  className="min-h-11 rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-gold hover:text-gold"
                >
                  Undercut lowest · ₱{Math.max(1, competing.min - 100).toLocaleString("en-PH")}
                </button>
              </div>
            </div>
          )}

          <Field label={values.format === "auction" ? "Starting bid (₱)" : "Your price (₱)"} error={errors.price?.message}>
            <input {...register("price", { valueAsNumber: true })} inputMode="decimal" className={cn(inputCls, "font-mono tabular-nums")} />
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
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-ink-dim transition-colors hover:text-ink disabled:opacity-0"
          >
            <ChevronLeft size={15} aria-hidden /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className={btnPrimary}>
              Continue <ChevronRight size={15} aria-hidden />
            </button>
          ) : (
            <button type="submit" disabled={uploading} aria-busy={uploading} className={btnPrimary}>
              {uploading && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />}
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
              <CardArt listing={preview} />
            </div>
          </div>
          <p className="mt-3 text-center font-display text-xl text-gold">₱{Number(values.price || 0).toLocaleString("en-PH")}</p>
        </div>
      </aside>
    </div>
  );
}
