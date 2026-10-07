import { z } from "zod";
import type { CreateListingPayload } from "@/lib/api";

export const CONDITIONS = [
  ["NM", "Near Mint"],
  ["LP", "Lightly Played"],
  ["MP", "Moderately Played"],
  ["HP", "Heavily Played"],
  ["DMG", "Damaged"],
] as const;

export const GRADERS = ["PSA", "BGS", "CGC", "SGC", "TAG", "ACE"] as const;

// every value matches the server's grade rule: 10, or 1-9 with an optional .5
export const GRADES = ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4", "3", "2", "1"] as const;

export const AUCTION_HOURS = [
  [24, "1 day"],
  [72, "3 days"],
  [168, "7 days"],
] as const;

const MAX_PRICE = 10_000_000;
const MAX_AUCTION_HOURS = 720;

const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

/** Mirrors the API's CreateListingRequestValidator so mistakes show before submitting. */
export const sellSchema = z
  .object({
    category: z.string().min(1, "Choose a game or sport"),
    isSports: z.boolean(),
    player: z.string().trim().min(1, "Name the card or player").max(200),
    team: z.string().trim().max(200).optional(),
    year: z
      .number({ message: "Enter a 4-digit year" })
      .int("Enter a 4-digit year")
      .min(1900, "Year must be between 1900 and next year")
      .refine((y) => y <= new Date().getFullYear() + 1, "Year must be between 1900 and next year")
      .optional(),
    set: z.string().trim().min(1, "Which set is it from?").max(200),
    cardNumber: z.string().trim().max(30, "30 characters at most").optional(),
    language: z.string(),
    parallel: z.string().trim().max(100, "100 characters at most").optional(),
    serialNumber: z.string().trim().max(50, "50 characters at most").optional(),
    type: z.enum(["single_card", "lot", "hobby_box", "accessory"]),
    graded: z.boolean(),
    gradingCompany: z.enum(GRADERS).optional(),
    gradeValue: z.enum(GRADES).optional(),
    condition: z.enum(["NM", "LP", "MP", "HP", "DMG"]).optional(),
    description: z.string().trim().max(2000, "2000 characters at most").optional(),
    format: z.enum(["fixed", "auction"]),
    endsInHours: z.number().optional(),
    price: z
      .number({ message: "Set a price" })
      .gt(0, "Set a price above zero")
      .max(MAX_PRICE, "Price can't be above ₱10,000,000")
      .refine(hasAtMostTwoDecimals, "Price supports two decimal places"),
  })
  .superRefine((v, ctx) => {
    if (v.isSports && !v.team) ctx.addIssue({ code: "custom", path: ["team"], message: "Which team is it?" });
    if (v.isSports && v.year === undefined) ctx.addIssue({ code: "custom", path: ["year"], message: "Sports cards need a year" });
    if (v.graded && !v.gradingCompany) ctx.addIssue({ code: "custom", path: ["gradingCompany"], message: "Pick the grading company" });
    if (v.graded && !v.gradeValue) ctx.addIssue({ code: "custom", path: ["gradeValue"], message: "Pick the grade" });
    if (!v.graded && v.type === "single_card" && !v.condition)
      ctx.addIssue({ code: "custom", path: ["condition"], message: "Pick a condition" });
    if (v.format === "auction") {
      const h = v.endsInHours;
      if (h === undefined || !Number.isInteger(h) || h < 1 || h > MAX_AUCTION_HOURS)
        ctx.addIssue({ code: "custom", path: ["endsInHours"], message: "Auctions run between 1 hour and 30 days" });
    }
  });

export type SellValues = z.infer<typeof sellSchema>;

/** Request body for POST /api/listings, without fields that don't apply to this listing. */
export function toListingPayload(v: SellValues): CreateListingPayload {
  const rawSingle = !v.graded && v.type === "single_card";
  return {
    category: v.category,
    player: v.player,
    team: v.isSports ? v.team : undefined,
    year: v.year,
    set: v.set,
    cardNumber: v.cardNumber || undefined,
    language: v.language,
    parallel: v.parallel || undefined,
    serialNumber: v.isSports ? v.serialNumber || undefined : undefined,
    graded: v.graded,
    gradingCompany: v.graded ? v.gradingCompany : undefined,
    gradeValue: v.graded ? v.gradeValue : undefined,
    condition: rawSingle ? v.condition : undefined,
    type: v.type,
    format: v.format,
    price: v.price,
    endsInHours: v.format === "auction" ? v.endsInHours : undefined,
    description: v.description || undefined,
  };
}
