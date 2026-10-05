// Fetches TV data from EPREL, the official EU energy-label registry.
//
// Every display sold in the EU must be registered there by its supplier, so
// the data is a legally binding manufacturer declaration. EPREL is reliable
// for: screen size, resolution, panel technology, the real model year,
// whether the TV supports HDR, energy class and power consumption.
// It does NOT know about: OS, HDMI/USB ports, refresh rate, picture
// processor, audio or HDR formats.
//
// IMPORTANT: this script only DOWNLOADS. It never changes masterTvs.json.
// The result is cached in src/Data/eprelSpecs.json; apply it afterwards with
// scripts/applyEprelSpecs.js.
//
// EPREL's search is fuzzy and happily returns another supplier's product, so
// a hit is only accepted when the brand, the screen size and the model number
// all match. Everything else is written to the cache as a candidate for
// manual review instead.
//
// Usage:
//   node scripts/fetchEprelSpecs.js
//   node scripts/fetchEprelSpecs.js --brands VIVAX,TESLA
//   node scripts/fetchEprelSpecs.js --limit 20
//   node scripts/fetchEprelSpecs.js --refetch

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const CACHE_FILE = path.join(DATA_DIR, "eprelSpecs.json");
const CATALOG_FILE = path.join(DATA_DIR, "eprelCatalog.json");

const API = "https://eprel.ec.europa.eu/api/products/electronicdisplays";
const REFERER = "https://eprel.ec.europa.eu/screen/product/electronicdisplays";
const DELAY_MS = 400;

// ============================================================
// ARGUMENTS
// ============================================================

const args = process.argv.slice(2);

function arg(name, fallback = null) {
  const i = args.indexOf("--" + name);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const OPTS = {
  limit: Number(arg("limit", 0)) || 0,
  brands: arg("brands")
    ? String(arg("brands")).split(",").map((b) => b.trim().toUpperCase()).filter(Boolean)
    : null,
  onlyMissing: Boolean(arg("only-missing", false)),
  refetch: Boolean(arg("refetch", false)),
  retryUnconfirmed: Boolean(arg("retry-unconfirmed", false)),
};

// ============================================================
// HELPERS
// ============================================================

// Some retailers use Cyrillic letters that look like Latin ones.
const LOOKALIKE = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P",
  С: "C", Т: "T", У: "Y", Х: "X", І: "I", Ј: "J",
  а: "a", в: "b", е: "e", к: "k", м: "m", о: "o", р: "p",
  с: "c", т: "t", у: "y", х: "x",
};

function delookalike(value) {
  return String(value || "").split("").map((ch) => LOOKALIKE[ch] || ch).join("");
}

function norm(value) {
  return delookalike(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

// ============================================================
// QUERY VARIANTS
// ============================================================

function searchTerms(tv) {
  const model = delookalike(tv.model).trim();
  const terms = [model];

  // Regional suffixes the shops add: "/12", ".CEI", " UXXH".
  const stripped = model
    .replace(/\s*\/\s*\d{1,2}$/, "")
    .replace(/\.(CEI|AEU|BEU|ZG|AUS|RU)$/i, "")
    .trim();
  terms.push(stripped);

  // Vivax is listed as "TV-32LE115T2S2" in some shops, "32LE115T2S2" in EPREL.
  terms.push(stripped.replace(/^TV-\s*/i, ""));

  // Shop names sometimes contain spaces: "50 BIQ 8000".
  terms.push(stripped.replace(/\s+/g, ""));

  return [...new Set(terms.filter((t) => t && t.length >= 4))];
}

// ============================================================
// MATCH VERIFICATION
// ============================================================

function supplierText(hit) {
  const org =
    typeof hit.organisation === "string"
      ? hit.organisation
      : hit.organisation?.organisationTitle;

  return [hit.supplierOrTrademark || hit.supplier, org].filter(Boolean).join(" | ");
}

function brandMatches(tv, hit) {
  const text = supplierText(hit);
  if (!text) return false;

  // Short brand names ("ST", "NEO") would match inside unrelated words.
  if (tv.brand.length <= 3) {
    return new RegExp(`\\b${tv.brand}\\b`, "i").test(text);
  }

  return norm(text).includes(norm(tv.brand));
}

function sizeMatches(tv, hit) {
  if (!tv.size || !hit.diagonalInch) return false;
  return Math.abs(Number(hit.diagonalInch) - tv.size) <= 1;
}

/** "exact" | "close" | null */
function modelMatch(tv, hit) {
  const ours = norm(delookalike(tv.model).replace(/^TV-\s*/i, ""));
  const theirs = norm(hit.modelIdentifier);

  if (!ours || !theirs) return null;
  if (ours === theirs) return "exact";

  // One is the other plus a regional suffix (43UA9005 vs 43UA9005X).
  if (theirs.startsWith(ours) && theirs.length - ours.length <= 6) return "close";
  if (ours.startsWith(theirs) && ours.length - theirs.length <= 6) return "close";

  // EPREL sometimes puts the series in front of the model number
  // ("B Series 32LE21K", "TV-40LE110WO"). Only for model numbers that are
  // long enough to be unambiguous.
  if (ours.length >= 5 && theirs.endsWith(ours)) return "close";

  return null;
}

/** Picks the best verified hit, or null. */
function pickHit(tv, hits) {
  const accepted = [];

  for (const hit of hits) {
    const confidence = modelMatch(tv, hit);
    if (!confidence) continue;
    if (!brandMatches(tv, hit)) continue;
    if (!sizeMatches(tv, hit)) continue;
    accepted.push({ hit, confidence });
  }

  if (!accepted.length) return null;

  accepted.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "exact" ? -1 : 1;
    return (b.hit.onMarketStartDateTS || 0) - (a.hit.onMarketStartDateTS || 0);
  });

  return accepted[0];
}

// ============================================================
// THE FIELDS WE KEEP
// ============================================================

function keepFields(hit) {
  if (hit.supplier !== undefined) return hit; // already trimmed

  return {
    modelIdentifier: hit.modelIdentifier,
    supplier: hit.supplierOrTrademark || null,
    organisation: hit.organisation?.organisationTitle || null,
    diagonalInch: hit.diagonalInch ?? null,
    diagonalCm: hit.diagonalCm ?? null,
    resolutionHorizontalPixels: hit.resolutionHorizontalPixels ?? null,
    resolutionVerticalPixels: hit.resolutionVerticalPixels ?? null,
    panelTechnology: hit.panelTechnology || null,
    energyClassSDR: hit.energyClassSDR || null,
    energyClassHDR: hit.energyClassHDR || null,
    powerOnModeSDR: hit.powerOnModeSDR ?? null,
    powerOnModeHDR: hit.powerOnModeHDR ?? null,
    powerStandby: hit.powerStandby ?? null,
    onMarketStartDate: hit.onMarketStartDate || null,
    minGuaranteedSupportYears: hit.minGuaranteedSupportYears ?? null,
    productModelCoreId: hit.productModelCoreId ?? null,
  };
}

// ============================================================
// API
// ============================================================

async function search(term) {
  const url =
    `${API}?_page=1&_limit=10&genericField=MODEL_IDENTIFIER` +
    `&modelIdentifier=${encodeURIComponent(term)}` +
    `&sort0=onMarketStartDateTS&order0=DESC`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: REFERER,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.hits) ? json.hits : [];
}

async function searchSupplier(brand, page) {
  const url =
    `${API}?_page=${page}&_limit=100` +
    `&supplierOrTrademark=${encodeURIComponent(brand)}` +
    `&sort0=onMarketStartDateTS&order0=DESC`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: REFERER,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return Array.isArray(json.hits) ? json.hits : [];
}

/**
 * Downloads a supplier's whole list of displays, once per run.
 *
 * Samsung and Sony register their TVs under codes our shops do not use
 * ("QE55Q80DATXXH" for QE55Q80D, "K-55S25M2" for K55S25M2PB.CEI), and the
 * per-model search only matches whole words, so it never finds them.
 * Matching against the supplier's full list locally does.
 */
async function brandCatalog(brand, catalogs) {
  if (catalogs[brand]) return catalogs[brand];

  const all = [];

  for (let page = 1; page <= 50; page++) {
    const hits = await searchSupplier(brand, page);
    all.push(...hits.map(keepFields));
    if (hits.length < 100) break;
    await sleep(DELAY_MS);
  }

  catalogs[brand] = all;
  console.log(`  (downloaded ${all.length} ${brand} displays from EPREL)`);

  return all;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = loadJson(MASTER_FILE, null);
  if (!master) throw new Error("Missing " + MASTER_FILE);

  const cache = loadJson(CACHE_FILE, {});
  const catalogs = loadJson(CATALOG_FILE, {});

  let targets = master;

  if (OPTS.brands) {
    targets = targets.filter((tv) => OPTS.brands.includes(String(tv.brand).toUpperCase()));
  }
  if (OPTS.onlyMissing) {
    targets = targets.filter((tv) => !tv.specsSource);
  }
  if (OPTS.retryUnconfirmed) {
    targets = targets.filter((tv) => cache[tv.id] && !cache[tv.id].found);
  } else if (!OPTS.refetch) {
    targets = targets.filter((tv) => cache[tv.id] === undefined);
  }
  if (OPTS.limit) {
    targets = targets.slice(0, OPTS.limit);
  }

  console.log(`EPREL: ${targets.length} TVs to check (${master.length} total)\n`);
  if (!targets.length) return;

  let found = 0;
  let review = 0;
  let missing = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const tv = targets[i];
    const label = `${i + 1}/${targets.length} ${tv.brand} ${tv.model} (${tv.size}")`;

    try {
      const seen = new Map();
      let picked = null;

      for (const term of searchTerms(tv)) {
        const hits = await search(term);
        hits.forEach((hit) => seen.set(hit.productModelCoreId || hit.modelIdentifier, hit));

        picked = pickHit(tv, [...seen.values()]);
        if (picked && picked.confidence === "exact") break;

        await sleep(DELAY_MS);
      }

      if (!picked) {
        // Second attempt: match against the supplier's whole EPREL list.
        const catalog = await brandCatalog(tv.brand, catalogs);
        picked = pickHit(tv, catalog);
        if (picked) picked.viaCatalog = true;
      }

      if (picked) {
        cache[tv.id] = {
          found: true,
          confidence: picked.confidence,
          viaCatalog: Boolean(picked.viaCatalog),
          data: keepFields(picked.hit),
          checkedAt: new Date().toISOString(),
        };
        found++;
        const d = cache[tv.id].data;
        console.log(
          `  ✓ ${label} → ${d.supplier || d.organisation} ${d.modelIdentifier} ` +
            `| ${d.diagonalInch}" | ${d.resolutionHorizontalPixels}x${d.resolutionVerticalPixels} ` +
            `| ${d.panelTechnology} | ${(d.onMarketStartDate || [])[0] || "?"} [${picked.confidence}]`
        );
      } else if (seen.size) {
        // EPREL returned something, but it did not pass the checks.
        cache[tv.id] = {
          found: false,
          needsReview: true,
          candidates: [...seen.values()].slice(0, 5).map((hit) => ({
            modelIdentifier: hit.modelIdentifier,
            supplier: hit.supplierOrTrademark || hit.organisation?.organisationTitle || null,
            diagonalInch: hit.diagonalInch ?? null,
          })),
          checkedAt: new Date().toISOString(),
        };
        review++;
        console.log(
          `  ? ${label} — not confirmed, candidates: ` +
            cache[tv.id].candidates
              .map((c) => `${c.supplier} ${c.modelIdentifier} (${c.diagonalInch}")`)
              .join(", ")
        );
      } else {
        cache[tv.id] = { found: false, checkedAt: new Date().toISOString() };
        missing++;
        console.log(`  ✗ ${label} — not in EPREL`);
      }
    } catch (error) {
      cache[tv.id] = { error: String(error.message || error), checkedAt: new Date().toISOString() };
      errors++;
      console.log(`  ! ${label} — ${error.message}`);
    }

    if ((i + 1) % 20 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogs, null, 1));
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogs, null, 1));

  console.log("\n--- Done ---");
  console.log(`confirmed: ${found}, needs review: ${review}, not in EPREL: ${missing}, errors: ${errors}`);
  console.log(`Cache: ${path.relative(process.cwd(), CACHE_FILE)}`);
  console.log("Nothing was written to masterTvs.json. Next: node scripts/applyEprelSpecs.js");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
