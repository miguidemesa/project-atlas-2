import { isBelowMinimum } from "./version";

it.each([
  ["1.0.0", "1.0.1", true],
  ["1.2.10", "1.10.0", true],
  ["1.9.9", "2.0", true],
  ["2.0", "1.9.9", false],
  ["1.0.0", "1.0", false],
  ["1.0.0", "1.0.0", false],
])("%s is below %s: %s", (current, minimum, below) => {
  expect(isBelowMinimum(current, minimum)).toBe(below);
});

it.each([
  ["1.0.0", ""],
  ["1.0.0", "1.0.0-beta"],
  ["1.0.0", "latest"],
  [undefined, "2.0.0"],
  ["1.0.0", undefined],
])("never locks anyone out over a version it can't read (%s, %s)", (current, minimum) => {
  expect(isBelowMinimum(current, minimum)).toBe(false);
});
