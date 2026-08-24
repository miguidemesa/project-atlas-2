#!/usr/bin/env node
/**
 * Pulls real card data + images into the mockup seed.
 *
 * Sources:
 *  - pokemontcg.io API (no key required) — Pokémon card scans + metadata
 *  - eBay Browse API (requires EBAY_APP_ID in env; register free at
 *    https://developer.ebay.com) — active listings for any category.
 *
 * Images are downloaded to public/seed-images/ and referenced by
 * src/lib/data.ts listings via imageUrl. MOCKUP USE ONLY: Pokémon scans are
 * © Nintendo/Creatures/GAME FREAK; eBay photos belong to their sellers.
 * Replace with seller uploads before production.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "seed-images");
const UA = "atlas-marketplace-dev/0.1";

const getJson = async (url, tries = 3) => {
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (i === tries) throw new Error(`HTTP ${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 800 * i));
  }
};

async function ptcg(search, outFile) {
  const params = new URLSearchParams({ q: search.q });
  const cards = (await getJson(`https://api.pokemontcg.io/v2/cards?${params}`)).data ?? [];
  const card = cards.find((c) => search.number && c.number === search.number) ?? cards.find(search.pick ?? (() => true)) ?? cards[0];
  if (!card) throw new Error(`ptcg "${search.q}": no match`);
  const img = card.images?.large ?? card.images?.small;
  if (!img) throw new Error(`ptcg ${card.id}: no image`);
  await mkdir(OUT_DIR, { recursive: true });
  const bin = await fetch(img, { headers: { "User-Agent": UA } }).then((r) => r.arrayBuffer());
  await writeFile(path.join(OUT_DIR, outFile), Buffer.from(bin));
  console.log(`✓ ${card.name} [${card.set?.name} #${card.number}] (${card.rarity ?? "?"}) → public/seed-images/${outFile}`);
  return {
    name: card.name,
    set: card.set?.name,
    number: card.number,
    rarity: card.rarity,
    artist: card.artist,
    source: "pokemontcg.io",
    sourceId: card.id,
    localImage: `/seed-images/${outFile}`,
  };
}

async function ebay(query, outFileBase, limit = 6) {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) {
    console.log("⚠ EBAY_APP_ID not set — skipping eBay pull (register at developer.ebay.com)");
    return;
  }
  // OAuth2 client credentials
  const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${appId}:${process.env.EBAY_CLIENT_SECRET ?? ""}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });
  if (!tokenRes.ok) throw new Error(`eBay token: HTTP ${tokenRes.status}`);
  const { access_token } = await tokenRes.json();

  const search = new URLSearchParams({ q: query, limit: String(limit), filter: "conditionIds:{1000|1500}" });
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${search}`, {
    headers: { Authorization: `Bearer ${access_token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (!res.ok) throw new Error(`eBay search: HTTP ${res.status}`);
  const { itemSummaries = [] } = await res.json();
  await mkdir(OUT_DIR, { recursive: true });

  const rows = [];
  let i = 0;
  for (const item of itemSummaries) {
    const img = item.image?.imageUrl;
    if (!img) continue;
    const file = `${outFileBase}-${++i}.webp`;
    try {
      const bin = await fetch(img).then((r) => r.arrayBuffer());
      await writeFile(path.join(OUT_DIR, file), Buffer.from(bin));
      rows.push({
        title: item.title,
        priceUsd: Number(item.price?.value ?? 0),
        condition: item.condition,
        url: item.itemWebUrl,
        seller: item.seller?.username,
        localImage: `/seed-images/${file}`,
      });
      console.log(`✓ ${item.title.slice(0, 60)} — $${item.price?.value}`);
    } catch (e) {
      console.log(`✗ image failed: ${e.message}`);
    }
  }
  await writeFile(path.join(ROOT, "src", "lib", `ebay-${outFileBase}.json`), JSON.stringify(rows, null, 2));
}

const PTCG_TARGETS = [
  [{ q: "set.id:sv8 number:238" }, "pikachu-ex-ssp.png"],
  [{ q: "name:giratina", pick: (c) => c.set?.id === "swsh12pt5" && c.name === "Giratina V" }, "giratina-v-crz.png"],
];

const args = process.argv.slice(2);
if (args.includes("--ebay")) {
  const q = args[args.indexOf("--ebay") + 1];
  await ebay(q, q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30), Number(args[4] ?? 6));
} else {
  const meta = [];
  for (const [id, file] of PTCG_TARGETS) meta.push(await ptcg(id, file));
  await writeFile(path.join(ROOT, "src", "lib", "pokemon-image-credits.json"), JSON.stringify(meta, null, 2));
}
