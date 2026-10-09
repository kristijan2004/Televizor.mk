// Looks up a TV model in the scraped retailer data (Anhoch, Neptun, DDStore, Setec)
// and prints price, stock and link. Read-only.
//
// Usage (from the project root):
//   node .claude/skills/write-novosti-article/find-model.mjs <words...>
//   e.g.  find-model.mjs lg oled c5      find-model.mjs 55U7
//
// Every word must appear in brand + model + name (case-insensitive, spaces ignored).
// This data is a snapshot — always confirm the price on the live product page
// before putting it in an article.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const SOURCES = [
  ["Anhoch", "src/Data/anhochTvs.json"],
  ["Neptun", "src/Data/neptunTvs.json"],
  ["DDStore", "src/Data/ddstoreTvs.json"],
  ["Setec", "setec-tvs.json"],
];

const words = process.argv.slice(2).map((w) => w.toLowerCase().replace(/\s+/g, ""));
if (!words.length) {
  console.error("usage: find-model.mjs <words...>");
  process.exit(2);
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");

let hits = 0;
for (const [store, rel] of SOURCES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const list = Array.isArray(raw) ? raw : raw.tvs || Object.values(raw).find(Array.isArray) || [];
  const stamp = fs.statSync(file).mtime.toISOString().slice(0, 10);
  for (const tv of list) {
    const hay = norm(`${tv.brand} ${tv.model} ${tv.name}`);
    if (!words.every((w) => hay.includes(w))) continue;
    hits++;
    const price = tv.price ? `${Number(tv.price).toLocaleString("de-DE")} ден.` : "no price";
    const stock = tv.inStock === true ? "in stock" : tv.inStock === false ? "out of stock" : "stock ?";
    // Anhoch entries have no URL, only a slug; search the name on anhoch.com instead.
    // Anhoch entries only store a slug; product pages are anhoch.com/products/<slug>.
    let url = tv.url || (store === "Anhoch" && tv.slug ? `https://www.anhoch.com/products/${tv.slug}` : "");
    // The Neptun scraper saves https://www.neptun.mk/<id>-<name>, which 404s;
    // the real product page lives under /categories/televizori/.
    url = url.replace(/^https:\/\/www\.neptun\.mk\/(\d+-)/, "https://www.neptun.mk/categories/televizori/$1");
    console.log(`${store.padEnd(8)} ${price.padEnd(14)} ${stock.padEnd(13)} ${tv.name || `${tv.brand} ${tv.model}`}`);
    if (url) console.log(`         ${url}`);
    console.log(`         data from ${(tv.scrapedAt || stamp).slice(0, 10)}`);
  }
}
if (!hits) console.log("no match in the scraped retailer data — check the retailer sites directly");
