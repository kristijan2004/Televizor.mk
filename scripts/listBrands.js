/**
 * Ги листа сите брендови во masterTvs.json и проверува дали се присутни
 * во рачната листа во src/components/SubNavigation.js.
 *
 * Употреба:  node scripts/listBrands.js
 *
 * Бидејќи листата на брендови во SubNavigation.js е рачна, нов бренд најден
 * од скриптите за скрапирање нема да се појави во филтрите додека не се додаде.
 * Оваа скрипта го открива тоа.
 */

const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "src", "Data", "masterTvs.json");
const SUBNAV = path.join(__dirname, "..", "src", "components", "SubNavigation.js");

const tvs = JSON.parse(fs.readFileSync(DATA, "utf8"));
const subnav = fs.readFileSync(SUBNAV, "utf8");

// Брои телевизори по бренд
const counts = new Map();
for (const tv of tvs) {
  const brand = (tv.brand || "?").trim();
  counts.set(brand, (counts.get(brand) || 0) + 1);
}

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

// Ги вади брендовите од двете рачни листи во SubNavigation.js
const listed = new Set();
for (const block of ["PRIMARY_BRANDS", "MORE_BRANDS"]) {
  const match = subnav.match(new RegExp(`const ${block} = \\[([^\\]]*)\\]`));
  if (!match) continue;
  for (const m of match[1].matchAll(/"([^"]+)"/g)) {
    listed.add(m[1].toLowerCase());
  }
}

console.log(`\nБрендови во masterTvs.json: ${sorted.length}  (${tvs.length} телевизори)\n`);

const missing = [];
for (const [brand, n] of sorted) {
  const ok = listed.has(brand.toLowerCase());
  if (!ok) missing.push(brand);
  console.log(`  ${ok ? "✓" : "✗"}  ${String(n).padStart(4)}  ${brand}`);
}

// Брендови во листата што ги нема во податоците
const extra = [...listed].filter(
  (b) => ![...counts.keys()].some((k) => k.toLowerCase() === b)
);

console.log("");

if (missing.length) {
  console.log(`✗ НЕДОСТАСУВААТ во SubNavigation.js (${missing.length}): ${missing.join(", ")}`);
  console.log("  Додај ги во MORE_BRANDS за да се појават во филтрите.\n");
}

if (extra.length) {
  console.log(`! Во листата, но нема такви телевизори (${extra.length}): ${extra.join(", ")}`);
  console.log("  Овие филтри ќе враќаат 0 резултати.\n");
}

if (!missing.length && !extra.length) {
  console.log("✓ Листата во SubNavigation.js се совпаѓа со податоците.\n");
}

process.exit(missing.length ? 1 : 0);
