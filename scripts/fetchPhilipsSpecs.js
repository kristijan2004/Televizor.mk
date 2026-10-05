// Fetches specifications from philips.co.uk (and philips.bg for the models the
// UK site does not carry) for the Philips TVs in masterTvs.json.
//
// Philips product pages render the spec table on the client, but the data is
// embedded in the page as escaped JSON with the shape
//   csChapter -> csItem (csItemName) -> csValue (csValueName)
// so the whole spec sheet can be read from the HTML without a browser.
//
// Product URLs need both the model code and an SEO slug ("/c-p/55PUS8009_12/
// led-4k-ambilight-tv"); the code alone returns an error page. Both are listed
// in the per-country product sitemaps, which gives us a model -> URL map.
//
// What this adds: the picture engine, HDMI/USB counts, audio power and
// speaker setup, HDR formats and the gaming features. Philips does not
// publish panel brightness, so that field stays unknown.
//
// IMPORTANT: this script only DOWNLOADS. It never changes masterTvs.json.
//
// Usage:
//   node scripts/fetchPhilipsSpecs.js
//   node scripts/fetchPhilipsSpecs.js --limit 5
//   node scripts/fetchPhilipsSpecs.js --refetch

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const CACHE_FILE = path.join(DATA_DIR, "philipsSpecs.json");

// English labels first; the Bulgarian site is only used for the models the UK
// site does not list.
const SITEMAPS = [
  ["en", "https://www.philips.co.uk/prx/sitemap-B2C-en_GB-products-product-catalog-so.xml"],
  ["bg", "https://www.philips.bg/prx/sitemap-B2C-bg_BG-products-product-catalog-so.xml"],
];

const UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";
const DELAY_MS = 900;

const args = process.argv.slice(2);
const REFETCH = args.includes("--refetch");
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function loadJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

// ============================================================
// SITEMAPS -> model code -> product URL
// ============================================================

async function buildUrlMap() {
  const map = new Map();

  for (const [lang, url] of SITEMAPS) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`sitemap ${lang} HTTP ${res.status}`);

    const xml = await res.text();
    let added = 0;

    for (const m of xml.matchAll(
      /<loc>\s*(https:\/\/[^<\s]*\/c-p\/([A-Za-z0-9_]+)[^<\s]*)\s*<\/loc>/g
    )) {
      const key = norm(m[2]);
      const list = map.get(key) || [];

      if (!list.some((entry) => entry.lang === lang)) {
        list.push({ url: m[1], lang });
        map.set(key, list);
        added++;
      }
    }

    console.log(`  sitemap ${lang}: +${added} model codes`);
  }

  return map;
}

/** All candidate pages for one TV, English site first. */
function findUrls(tv, map) {
  const model = norm(tv.model);

  if (map.has(model)) {
    return map.get(model).map((entry) => ({ ...entry, match: "exact" }));
  }

  for (const [code, list] of map) {
    if (code.startsWith(model) && code.length - model.length <= 4) {
      return list.map((entry) => ({ ...entry, match: "prefix", code }));
    }
  }

  return [];
}

// ============================================================
// PRODUCT PAGE
// ============================================================

function unescapeJson(value) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSpecs(html) {
  const items = [...html.matchAll(/csItemName\\":\\"(.*?)\\"/g)];
  const specs = {};

  items.forEach((match, index) => {
    const start = match.index;
    const end = index + 1 < items.length ? items[index + 1].index : start + 4000;
    const values = [...html.slice(start, end).matchAll(/csValueName\\":\\"(.*?)\\"/g)]
      .map((v) => unescapeJson(v[1]))
      .filter(Boolean);

    if (!values.length) return;

    const label = unescapeJson(match[1]);
    if (label && specs[label] === undefined) specs[label] = values.join(", ");
  });

  return specs;
}

const DIAGONAL_LABELS = [
  "Diagonal screen size (inch)",
  "Размер на екрана по диагонал (инчове)",
];

function pageInches(specs) {
  for (const label of DIAGONAL_LABELS) {
    const value = Number(String(specs[label] || "").match(/\d+/)?.[0]);
    if (value) return value;
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = loadJson(MASTER_FILE, null);
  if (!master) throw new Error("Missing " + MASTER_FILE);

  const cache = loadJson(CACHE_FILE, {});

  console.log("Reading Philips sitemaps...");
  const map = await buildUrlMap();
  console.log(`  ${map.size} model codes in total\n`);

  let targets = master.filter((tv) => tv.brand === "PHILIPS");
  if (!REFETCH) targets = targets.filter((tv) => cache[tv.id] === undefined);
  if (Number.isFinite(LIMIT)) targets = targets.slice(0, LIMIT);

  console.log(`Philips: ${targets.length} TVs to fetch\n`);

  let ok = 0;
  let noUrl = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const tv = targets[i];
    const label = `${i + 1}/${targets.length} ${tv.model} (${tv.size}")`;
    const candidates = findUrls(tv, map);

    if (!candidates.length) {
      cache[tv.id] = { found: false, checkedAt: new Date().toISOString() };
      noUrl++;
      console.log(`  ✗ ${label} — no product page`);
      continue;
    }

    let lastError = null;
    let saved = false;

    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate.url, {
          headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" },
        });

        const html = await res.text();

        if (html.includes("__next_error__")) throw new Error("error page");

        const specs = extractSpecs(html);
        if (!Object.keys(specs).length) throw new Error("no spec data in the page");

        const inches = pageInches(specs);
        const sizeOk = !inches || !tv.size || Math.abs(inches - tv.size) <= 1;

        cache[tv.id] = {
          found: true,
          url: candidate.url,
          lang: candidate.lang,
          match: candidate.match,
          sizeOk,
          specs,
          checkedAt: new Date().toISOString(),
        };

        ok++;
        saved = true;
        console.log(
          `  ✓ ${label} → ${Object.keys(specs).length} specs [${candidate.lang}]${
            sizeOk ? "" : "  ⚠ SIZE MISMATCH"
          }`
        );
        break;
      } catch (error) {
        lastError = error;
        await sleep(DELAY_MS);
      }
    }

    if (!saved) {
      cache[tv.id] = {
        found: false,
        url: candidates[0].url,
        error: String(lastError?.message || lastError),
        checkedAt: new Date().toISOString(),
      };
      errors++;
      console.log(`  ! ${label} — ${lastError?.message}`);
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
