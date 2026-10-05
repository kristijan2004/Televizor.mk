// Compares the EPREL data from src/Data/eprelSpecs.json with masterTvs.json.
//
// By default it only PREVIEWS and writes a report to reports/. Use --write to
// change masterTvs.json (a backup is made first).
//
// Rules:
//   - Only fields that are empty on our side ("—", 0, null, []) are filled.
//   - A value we already have is never silently replaced; differences are
//     only reported. Use --overwrite-fields year,resolution to trust EPREL
//     for specific fields, or --overwrite for all of them.
//   - EPREL knows nothing about OS, ports, refresh rate, processor or audio,
//     so those fields are left alone.
//
// Usage:
//   node scripts/applyEprelSpecs.js
//   node scripts/applyEprelSpecs.js --write
//   node scripts/applyEprelSpecs.js --overwrite-fields year,resolution --write
//   node scripts/applyEprelSpecs.js --only tesla-43e635bfs

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const EPREL_FILE = path.join(DATA_DIR, "eprelSpecs.json");
const REPORT_DIR = path.join(__dirname, "..", "reports");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const OVERWRITE_ALL = args.includes("--overwrite");

function listArg(name) {
  const i = args.indexOf("--" + name);
  if (i === -1) return null;
  return (args[i + 1] || "").split(",").map((v) => v.trim()).filter(Boolean);
}

const OVERWRITE_FIELDS = listArg("overwrite-fields") || [];
const ONLY = listArg("only");

// EPREL's date is when the model went on sale in the EU. It fixes our bogus
// "2026" on older TVs, but a few models were re-registered later and then
// EPREL's year is the newer one. So overwriting `year` only ever moves it
// back in time, unless --year-any is given.
const YEAR_ANY_DIRECTION = args.includes("--year-any");

// ============================================================
// FIELD MAPPING
// ============================================================

function mapResolution(data) {
  const w = data.resolutionHorizontalPixels;
  const h = data.resolutionVerticalPixels;
  if (!w || !h) return null;

  if (w >= 7000) return "8K";
  if (w >= 3800) return "4K";
  if (w >= 1900) return "FHD";
  if (w >= 1280) return "HD Ready";

  return null;
}

const PANEL_NAMES = {
  OLED: "OLED",
  QD_OLED: "OLED",
  QLED_LCD: "QLED",
  LED_LCD: "LED",
  LCD: "LED",
  MICRO_LED: "Micro LED",
};

function mapTechnology(data) {
  return PANEL_NAMES[data.panelTechnology] || null;
}

function mapYear(data) {
  const year = (data.onMarketStartDate || [])[0];
  return year && year >= 2015 && year <= 2030 ? year : null;
}

// energyClassHDR is "NA" when the model has no HDR mode at all.
function mapHdr(data) {
  if (!data.energyClassHDR) return null;
  return data.energyClassHDR !== "NA";
}

function eprelToFields(data) {
  const fields = {
    size: data.diagonalInch ? Math.round(Number(data.diagonalInch)) : null,
    resolution: mapResolution(data),
    technology: mapTechnology(data),
    year: mapYear(data),
    hdr: mapHdr(data),
  };

  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));
}

// ============================================================
// HELPERS
// ============================================================

function isBlank(field, value) {
  if (value === null || value === undefined || value === "") return true;
  if (value === "—" || value === "-") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (["size", "year"].includes(field)) return value === 0;
  return false;
}

// Our data uses brand names that EPREL does not know ("Neo QLED", "QNED").
// EPREL calling such a TV "LED" or "QLED" is not a real disagreement.
const REFINED_LED = [
  "Mini LED", "RGB Mini LED", "Neo QLED", "QNED", "NanoCell",
  "Micro RGB", "ULED", "Direct LED", "Edge LED", "QLED",
];

function isRealTechnologyConflict(ours, theirs) {
  if (theirs === "LED" && REFINED_LED.includes(ours)) return false;
  if (theirs === "QLED" && ["Neo QLED", "Mini LED", "RGB Mini LED", "QNED"].includes(ours)) {
    return false;
  }
  return true;
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const eprel = JSON.parse(fs.readFileSync(EPREL_FILE, "utf8"));

  const fills = {};
  const conflicts = {};
  const filled = [];
  const disputed = [];
  const review = [];
  const skippedLaterYear = [];

  const updated = master.map((tv) => {
    const entry = eprel[tv.id];
    if (!entry) return tv;

    if (!entry.found) {
      if (entry.needsReview) review.push({ tv, candidates: entry.candidates || [] });
      return tv;
    }

    const fields = eprelToFields(entry.data);
    const toFill = {};
    const differs = {};

    for (const [key, value] of Object.entries(fields)) {
      if (JSON.stringify(tv[key]) === JSON.stringify(value)) continue;

      if (isBlank(key, tv[key])) {
        toFill[key] = { before: tv[key], after: value };
        fills[key] = (fills[key] || 0) + 1;
      } else {
        if (key === "technology" && !isRealTechnologyConflict(tv[key], value)) continue;
        differs[key] = { ours: tv[key], eprel: value };
        conflicts[key] = (conflicts[key] || 0) + 1;
      }
    }

    if (Object.keys(toFill).length) filled.push({ tv, entry, toFill });
    if (Object.keys(differs).length) disputed.push({ tv, entry, differs });

    const applied = {};
    for (const [key, { after }] of Object.entries(toFill)) applied[key] = after;

    for (const [key, { ours, eprel: value }] of Object.entries(differs)) {
      if (!OVERWRITE_ALL && !OVERWRITE_FIELDS.includes(key)) continue;

      if (key === "year" && !YEAR_ANY_DIRECTION && typeof ours === "number" && value > ours) {
        skippedLaterYear.push({ tv, ours, eprel: value });
        continue;
      }

      applied[key] = value;
    }

    if (!Object.keys(applied).length) return tv;

    const source = tv.specsSource
      ? tv.specsSource.includes("eprel")
        ? tv.specsSource
        : `${tv.specsSource}+eprel`
      : "eprel";

    return { ...tv, ...applied, specsSource: source };
  });

  // ---------- preview ----------

  const checked = Object.keys(eprel).length;
  const confirmed = Object.values(eprel).filter((e) => e.found).length;

  console.log(`Checked in EPREL: ${checked}`);
  console.log(`  confirmed: ${confirmed}`);
  console.log(`\nTVs with empty fields that would be filled: ${filled.length}`);
  console.log(`TVs where EPREL disagrees with us: ${disputed.length}`);
  console.log(`Unconfirmed matches for manual review: ${review.length}`);

  if (skippedLaterYear.length) {
    console.log(
      `\nYear left alone on ${skippedLaterYear.length} TVs where EPREL is later than ours ` +
        `(use --year-any to apply those too):`
    );
    skippedLaterYear.forEach(({ tv, ours, eprel: v }) =>
      console.log(`  ${tv.brand} ${tv.model}: ours ${ours} | EPREL ${v}`)
    );
  }

  if (OVERWRITE_FIELDS.length) {
    console.log(`\nEPREL will also overwrite: ${OVERWRITE_FIELDS.join(", ")}`);
  }

  console.log("\nFills per field:");
  Object.entries(fills).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v}`));

  console.log("\nDisagreements per field:");
  Object.entries(conflicts).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v}`));

  const examples = ONLY
    ? [...filled, ...disputed].filter(({ tv }) => ONLY.includes(tv.id))
    : disputed.filter((_, i) => i % Math.max(1, Math.ceil(disputed.length / 6)) === 0);

  examples.forEach(({ tv, entry, toFill, differs }) => {
    console.log(`\n=== ${tv.brand} ${tv.model} (${tv.id})`);
    console.log(`    EPREL: ${entry.data.supplier || entry.data.organisation} ${entry.data.modelIdentifier} [${entry.confidence}]`);
    Object.entries(toFill || {}).forEach(([k, { before, after }]) =>
      console.log(`    fill  ${k.padEnd(11)} ${JSON.stringify(before).padEnd(12)} → ${JSON.stringify(after)}`)
    );
    Object.entries(differs || {}).forEach(([k, { ours, eprel: v }]) =>
      console.log(`    diff  ${k.padEnd(11)} ours ${JSON.stringify(ours).padEnd(12)} | EPREL ${JSON.stringify(v)}`)
    );
  });

  // ---------- report ----------

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const lines = [];
  lines.push("# EPREL report\n");
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}\n`);
  lines.push(`- Checked: ${checked}`);
  lines.push(`- Confirmed in EPREL: ${confirmed}`);
  lines.push(`- Would get new data: ${filled.length}`);
  lines.push(`- Disagreements: ${disputed.length}\n`);

  lines.push("## Fills per field\n");
  Object.entries(fills).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));

  lines.push("\n## Disagreements per field\n");
  Object.entries(conflicts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));

  lines.push("\n## All fills\n");
  filled.forEach(({ tv, entry, toFill }) => {
    lines.push(`### ${tv.brand} ${tv.model} (${tv.id})`);
    lines.push(`EPREL: ${entry.data.supplier || entry.data.organisation} ${entry.data.modelIdentifier} — ${entry.confidence}`);
    Object.entries(toFill).forEach(([k, { before, after }]) =>
      lines.push(`- ${k}: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``)
    );
    lines.push("");
  });

  lines.push("\n## All disagreements (left unchanged unless overwritten)\n");
  disputed.forEach(({ tv, entry, differs }) => {
    lines.push(`### ${tv.brand} ${tv.model} (${tv.id})`);
    lines.push(`EPREL: ${entry.data.supplier || entry.data.organisation} ${entry.data.modelIdentifier}`);
    Object.entries(differs).forEach(([k, { ours, eprel: v }]) =>
      lines.push(`- ${k}: ours \`${JSON.stringify(ours)}\` | EPREL \`${JSON.stringify(v)}\``)
    );
    lines.push("");
  });

  lines.push("\n## Unconfirmed matches (EPREL returned something else)\n");
  review.forEach(({ tv, candidates }) =>
    lines.push(
      `- ${tv.brand} ${tv.model} (${tv.size}") → ` +
        candidates.map((c) => `${c.supplier} ${c.modelIdentifier} (${c.diagonalInch}")`).join(", ")
    )
  );

  const reportFile = path.join(REPORT_DIR, "eprel-report.md");
  fs.writeFileSync(reportFile, lines.join("\n"));
  console.log(`\nReport: ${path.relative(process.cwd(), reportFile)}`);

  if (!WRITE) {
    console.log("\nPreview only. Nothing was written. Use --write to apply.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(DATA_DIR, `masterTvs.before-eprel-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${path.relative(process.cwd(), backupFile)}`);
  console.log(`Updated: ${path.relative(process.cwd(), MASTER_FILE)}`);
}

main();
