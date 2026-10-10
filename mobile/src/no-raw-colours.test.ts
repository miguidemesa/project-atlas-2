import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

it("takes every colour from @atlas/tokens: no raw hex, rgb() or hsl() in src", () => {
  const offenders = sourceFiles(__dirname).filter((file) =>
    /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(readFileSync(file, "utf8")),
  );
  expect(offenders).toEqual([]);
});
