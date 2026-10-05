// Fetches specifications from samsung.com/mk for the Samsung TVs in
// masterTvs.json.
//
// Samsung publishes a full spec sheet on every product page, in Macedonian,
// as plain HTML (no API needed - their JSON endpoint returns 403). The page
// URL ends with the full model code, and every TV page is listed in
// https://www.samsung.com/mk/vd-sitemap.xml, so the sitemap gives us a
// model -> URL map without searching.
//
// What this adds that Icecat and EPREL do not have: the picture processor
// ("Picture Engine"), the real HDMI/USB counts, audio power and speaker
// layout, and the gaming features (VRR, ALLM, FreeSync).
// Samsung does NOT publish panel brightness, so that field stays unknown.
//
// IMPORTANT: this script only DOWNLOADS. It never changes masterTvs.json.
// Results go to src/Data/samsungSpecs.json; apply them with
// scripts/applySamsungSpecs.js.
//
// Usage:
//   node scripts/fetchSamsungSpecs.js
//   node scripts/fetchSamsungSpecs.js --limit 5
//   node scripts/fetchSamsungSpecs.js --refetch

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const CACHE_FILE = path.join(DATA_DIR, "samsungSpecs.json");
const SITEMAP = "https://www.samsung.com/mk/vd-sitemap.xml";
const DELAY_MS = 800;

const UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";

const args = process.argv.slice(2);
const REFETCH = args.includes("--refetch");
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function norm(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ============================================================
// SITEMAP -> model code -> product URL
// ============================================================

async function buildUrlMap() {
  const res = await fetch(SITEMAP, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);

  const xml = await res.text();
  const urls = [
    ...new Set(
      [...xml.matchAll(/https:\/\/www\.samsung\.com\/mk\/(?:tvs|lifestyle-tvs)\/[^<"]+/g)]
        .map((m) => m[0].replace(/\/$/, ""))
    ),
  ];

  const map = new Map();

  urls.forEach((url) => {
    // ".../s95d-55-inch-oled-4k-tizen-os-smart-tv-qe55s95datxxh"
    const code = url.split("/").pop().split("-").pop();
    if (code && code.length >= 6 && /\d/.test(code)) {
      map.set(code.toUpperCase(), url + "/");
    }
  });

  console.log(`Sitemap: ${urls.length} TV pages, ${map.size} model codes`);

  return map;
}

/** Finds the product page for one of our TVs. */
function findUrl(tv, map) {
  const model = norm(tv.model);

  if (map.has(model)) return { url: map.get(model), match: "exact" };

  // Shops drop the regional suffix: QE55Q80D -> QE55Q80DATXXH.
  for (const [code, url] of map) {
    if (code.startsWith(model) && code.length - model.length <= 6) {
      return { url, match: "prefix", code };
    }
  }

  return null;
}

// ============================================================
// PRODUCT PAGE
// ============================================================

const SPEC_PATTERN =
  /content-item-title">(.*?)<\/p>\s*<p class="[^"]*content-item-desc">(.*?)<\/p>/gs;

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSpecs(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "mk,en;q=0.9" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const specs = {};

  for (const [, rawLabel, rawValue] of html.matchAll(SPEC_PATTERN)) {
    const label = stripTags(rawLabel);
    const value = stripTags(rawValue);
    if (label && value && specs[label] === undefined) specs[label] = value;
  }

  return specs;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = loadJson(MASTER_FILE, null);
  if (!master) throw new Error("Missing " + MASTER_FILE);

  const cache = loadJson(CACHE_FILE, {});
  const map = await buildUrlMap();

  let targets = master.filter((tv) => tv.brand === "SAMSUNG");
  if (!REFETCH) targets = targets.filter((tv) => cache[tv.id] === undefined);
  if (Number.isFinite(LIMIT)) targets = targets.slice(0, LIMIT);

  console.log(`Samsung: ${targets.length} TVs to fetch\n`);

  let ok = 0;
  let noUrl = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const tv = targets[i];
    const label = `${i + 1}/${targets.length} ${tv.model} (${tv.size}")`;
    const found = findUrl(tv, map);

    if (!found) {
      cache[tv.id] = { found: false, checkedAt: new Date().toISOString() };
      noUrl++;
      console.log(`  ✗ ${label} — no product page on samsung.com/mk`);
      continue;
    }

    try {
      const specs = await fetchSpecs(found.url);

      if (!Object.keys(specs).length) throw new Error("no spec table on the page");

      // The page must describe a screen of the size we expect.
      const pageSize = Number((specs["Големина на екран"] || "").match(/\d+/)?.[0]);
      const sizeOk = !pageSize || !tv.size || Math.abs(pageSize - tv.size) <= 1;

      cache[tv.id] = {
        found: true,
        url: found.url,
        match: found.match,
        sizeOk,
        specCount: Object.keys(specs).length,
        specs,
        checkedAt: new Date().toISOString(),
      };

      ok++;
      console.log(
        `  ✓ ${label} → ${Object.keys(specs).length} specs${sizeOk ? "" : "  ⚠ SIZE MISMATCH"}`
      );
    } catch (error) {
      cache[tv.id] = {
        found: false,
        url: found.url,
        error: String(error.message || error),
        checkedAt: new Date().toISOString(),
      };
      errors++;
      console.log(`  ! ${label} — ${error.message}`);
    }

    if ((i + 1) % 10 === 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

  console.log("\n--- Done ---");
  console.log(`fetched: ${ok}, no page: ${noUrl}, errors: ${errors}`);
  console.log(`Cache: ${path.relative(process.cwd(), CACHE_FILE)}`);
  console.log("Nothing was written to masterTvs.json.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
