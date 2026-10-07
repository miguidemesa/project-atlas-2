import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("real data only", () => {
  it("no page or component imports the old stand-in dataset", () => {
    const offenders = sourceFiles("src").filter((file) =>
      /from ["'](@\/lib\/|\.\/)(data|deal-score)["']/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
