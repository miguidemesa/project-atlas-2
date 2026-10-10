import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderCss, renderTheme, type Tokens } from "./render.ts";

/** Regenerates tokens.css and src/theme.ts from tokens.json. Run: npm run build -w @atlas/tokens */
const at = (path: string) => new URL(path, import.meta.url);
const tokens = JSON.parse(readFileSync(at("../tokens.json"), "utf8")) as Tokens;

mkdirSync(at("../src/"), { recursive: true });
writeFileSync(at("../tokens.css"), renderCss(tokens));
writeFileSync(at("../src/theme.ts"), renderTheme(tokens));
console.log("Wrote tokens.css and src/theme.ts");
