// Fetches manufacturer specifications from Icecat (open, no account needed)
// for every TV in masterTvs.json.
//
// IMPORTANT: this script does NOT modify masterTvs.json.
// Results are saved to src/Data/icecatSpecs.json, keyed by TV id.
//
// TVs that are already in icecatSpecs.json are skipped, so running it again
// only checks new TVs. To re-check TVs that were not found, use:
//   node scripts/fetchIcecatSpecs.js --retry-missing
//
// Usage:
//   node scripts/fetchIcecatSpecs.js
//   node scripts/fetchIcecatSpecs.js --limit 20

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const NEPTUN_FILE = path.join(DATA_DIR, "neptunTvs.json");
const OUTPUT_FILE = path.join(DATA_DIR, "icecatSpecs.json");

const API = "https://live.icecat.biz/api?UserName=openIcecat-live&Language=en&";
const DELAY_MS = 250;

const args = process.argv.slice(2);
const RETRY_MISSING = args.includes("--retry-missing");
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// LOOKUP
// ============================================================

async function queryIcecat(params) {
  try {
    const response = await fetch(API + params);
    const json = await response.json();
    return json.msg === "OK" ? json.data : null;
  } catch {
    return null;
  }
}

// Different ways the same model number may be written.
// Some retailer model numbers contain Cyrillic letters that look Latin
// (e.g. "QE50Q8FAAUXХH" with a Cyrillic "Х").
const CYRILLIC_LOOKALIKES = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O",
  Р: "P", С: "C", Т: "T", Х: "X", У: "Y",
};

function toLatin(text) {
  return text.replace(/[АВЕКМНОРСТХУ]/g, (char) => CYRILLIC_LOOKALIKES[char]);
}

function modelVariants(tv) {
  const model = toLatin(String(tv.model || "").trim());
  const compact = model.replace(/\s+/g, "");
  const noDash = compact.replace(/-/g, "");
  const variants = [
    model,
    compact,
    noDash, // Samsung: QE-50Q7F2AAUXXH → QE50Q7F2AAUXXH
    compact.split(".")[0], // Sony: K77XR8AB.CEI → K77XR8AB
    compact.replace(/\/\d+$/, ""), // Philips: 55PUS8400/12 → 55PUS8400
    noDash.replace(/U?XXH$/, ""), // Samsung regional suffix
  ];

  if (tv.brand === "SAMSUNG" && !/XXH$/.test(noDash)) {
    variants.push(noDash + "UXXH"); // UE43CU7172 → UE43CU7172UXXH
  }

  if (tv.brand === "PHILIPS" && !/\/\d+$/.test(compact)) {
    variants.push(compact + "/12"); // 55PUS8400 → 55PUS8400/12
  }

  if (tv.brand === "SONY") {
    variants.push(compact.split(".")[0].replace(/^K(\d)/, "K-$1"));
  }

  // LG OLEDs are often listed without the "OLED" prefix: "55 B6 ELC".
  if (tv.brand === "LG" && /^\d{2,3}[BCGM]\d/.test(compact)) {
    variants.push("OLED" + compact);
  }

  return [...new Set(variants.filter(Boolean))];
}

// Inch size from Icecat title, e.g. '... 139.7 cm (55") ...'
function sizeFromTitle(title) {
  const match = String(title || "").match(/\((\d{2,3})"\)/);
  return match ? Number(match[1]) : null;
}

async function findOnIcecat(tv, barcode) {
  if (barcode) {
    const data = await queryIcecat("GTIN=" + encodeURIComponent(barcode));
    if (data) return { data, matchedBy: "barcode:" + barcode };
    await sleep(DELAY_MS);
  }

  for (const variant of modelVariants(tv)) {
    const data = await queryIcecat(
      `Brand=${encodeURIComponent(tv.brand)}&ProductCode=${encodeURIComponent(variant)}`
    );
    if (data) return { data, matchedBy: "model:" + variant };
    await sleep(DELAY_MS);
  }

  return null;
}

// Flattens Icecat feature groups into { "Group": { "Feature": "Value" } }
function flattenFeatures(data) {
  const specs = {};

  for (const group of data.FeaturesGroups || []) {
    const groupName = group.FeatureGroup?.Name?.Value || "Other";
    specs[groupName] = specs[groupName] || {};

    for (const feature of group.Features || []) {
      const name = feature.Feature?.Name?.Value;
      if (name) specs[groupName][name] = feature.PresentationValue;
    }
  }

  return specs;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const neptun = fs.existsSync(NEPTUN_FILE)
    ? JSON.parse(fs.readFileSync(NEPTUN_FILE, "utf8"))
    : [];
  const results = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"))
    : {};

  const barcodeByUrl = new Map(
    neptun.filter((t) => t.barcode).map((t) => [t.url, t.barcode])
  );

  const todo = master
    .filter((tv) => {
      const existing = results[tv.id];
      if (!existing) return true;
      return RETRY_MISSING && !existing.found;
    })
    .slice(0, LIMIT);

  console.log(`Icecat: ${todo.length} TVs to check (${master.length} total)\n`);

  let found = 0;

  for (const [index, tv] of todo.entries()) {
    const barcode = barcodeByUrl.get(tv.stores?.Neptun?.url) || null;
    const match = await findOnIcecat(tv, barcode);
    const checkedAt = new Date().toISOString().slice(0, 10);
    const label = `[${index + 1}/${todo.length}] ${tv.brand} ${tv.model}`;

    if (!match) {
      results[tv.id] = { found: false, checkedAt };
      console.log(`❌ ${label}`);
    } else {
      const info = match.data.GeneralInfo;
      const icecatSize = sizeFromTitle(info.Title);
      const sizeMismatch = Boolean(tv.size && icecatSize && tv.size !== icecatSize);

      results[tv.id] = {
        found: true,
        checkedAt,
        matchedBy: match.matchedBy,
        icecatId: info.IcecatId,
        title: info.Title,
        brand: info.Brand,
        productCode: info.BrandPartCode,
        // Our size and Icecat's size differ → probably wrong product.
        needsReview: sizeMismatch,
        specs: flattenFeatures(match.data),
      };

      found++;
      console.log(`${sizeMismatch ? "⚠️ " : "✅"} ${label} → ${info.Title}`);
    }

    // Save regularly so progress is not lost if the script stops.
    if (index % 20 === 0 || index === todo.length - 1) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\nFound ${found} / ${todo.length}`);
  console.log(`Saved to ${OUTPUT_FILE}`);
}

main();
