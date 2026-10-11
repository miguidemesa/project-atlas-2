import { expect, it } from "vitest";
import { conditionTone } from "./condition";

it("shows the grade for a slab and the condition for a raw card, with their tones", () => {
  expect(conditionTone({ graded: true, gradingCompany: "PSA", gradeValue: "10", condition: null })).toEqual({ label: "PSA 10", tone: "graded" });
  expect(conditionTone({ graded: false, gradingCompany: null, gradeValue: null, condition: "LP" })).toEqual({ label: "LP", tone: "fixed" });
  expect(conditionTone({ graded: false, gradingCompany: null, gradeValue: null, condition: "Sealed" })).toEqual({ label: "Sealed", tone: "plain" });
  expect(conditionTone({ graded: false, gradingCompany: null, gradeValue: null, condition: null })).toBeNull();
});
