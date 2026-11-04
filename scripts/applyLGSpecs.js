// Compares the technopolis.bg data in src/Data/lgSpecs.json with masterTvs.json.
//
// Previews by default and writes a report to reports/. Use --write to change
// masterTvs.json (a backup is made first).
//
// Same rules as the Philips/Samsung/EPREL scripts: only empty fields are
// filled, differences are reported rather than applied unless
// --overwrite-fields names them, HDR formats are merged instead of replaced.
//
// technopolis.bg's feature table is much thinner than Philips/Samsung's own
// sites: no audio power/brightness. What it DOES give: picture processor,
// HDMI/USB counts, OS, HDR, and (found 2026-10-29, after the first pass
// silently dropped it) Dolby Atmos and gaming features — several fields
// list MORE THAN ONE value under the same name (e.g. SOUND TECHNOLOGY:
// "Dolby Atmos" and "Clear Voice Pro" both), so fetchLGSpecs.js stores every
// field as an array now, never just the last value seen.
//
// Usage:
//   node scripts/applyLGSpecs.js
//   node scripts/applyLGSpecs.js --write
//   node scripts/applyLGSpecs.js --overwrite-fields hdmi,usb --write

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const LG_FILE = path.join(DATA_DIR, "lgSpecs.json");
const REPORT_DIR = path.join(__dirname, "..", "reports");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const OVERWRITE_ALL = args.includes("--overwrite");

function listArg(name) {
  const i = args.indexOf("--" + name);
  return i === -1 ? null : (args[i + 1] || "").split(",").map((v) => v.trim()).filter(Boolean);
}

const OVERWRITE_FIELDS = listArg("overwrite-fields") || [];

// ============================================================
// HELPERS
// ============================================================

const firstNumber = (value) => {
  const m = String(value || "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

// Every field is an array of values (a feature name can appear more than
// once per product - see note above). `joined` is for text-matching across
// all of them; `first` is for fields where we only ever want one value.
function joined(features, name) {
  return (features[name] || []).join(" | ");
}

function first(features, name) {
  return (features[name] || [])[0] || null;
}

function isBlank(field, value) {
  if (value === null || value === undefined || value === "") return true;
  if (value === "—" || value === "-") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (["hdmi", "usb", "audioPower", "size"].includes(field)) return value === 0;
  // false is the "not yet confirmed" default for these switches, not a
  // verified negative - so a page saying true should fill, not conflict.
  if (["dolbyAtmos", "vrr", "allm", "gSync", "freeSync"].includes(field)) return value === false;
  return false;
}

// Screen size must match (±1") before anything from the page is trusted —
// catches a sitemap-matching mistake before it poisons real data.
function sizeOk(tv, features) {
  const text = joined(features, "DISPLAY SIZE SM");
  if (!text) return true; // nothing to check against, don't block on it
  const cm = firstNumber(text);
  if (!cm) return true;
  const inches = cm / 2.54;
  return Math.abs(inches - tv.size) <= 1.5;
}

// ============================================================
// TECHNOPOLIS -> OUR FIELDS
// ============================================================

function mapResolution(features) {
  const text = joined(features, "RESOLUTION");
  if (/8K/i.test(text)) return "8K";
  if (/3840\s*x\s*2160|4K/i.test(text)) return "4K";
  if (/1920\s*x\s*1080|full\s*hd/i.test(text)) return "FHD";
  if (/1366\s*x\s*768|hd\s*ready/i.test(text)) return "HD Ready";
  return null;
}

function mapTechnology(features) {
  const text = joined(features, "SCREEN TECHNOLOGY");
  if (/oled/i.test(text)) return "OLED";
  if (/mini\s*led/i.test(text)) return "Mini LED";
  if (/qled|qned/i.test(text)) return "QLED";
  if (/nanocell/i.test(text)) return "NanoCell";
  if (/led/i.test(text)) return "LED";
  return null;
}

function mapOs(features) {
  const text = joined(features, "OPERATING SYSTEM");
  if (/webos/i.test(text)) return "webOS";
  return null;
}

function mapHdrFormats(features) {
  const text = joined(features, "HDR");
  const imageText = joined(features, "IMAGE TECHNOLOGY");
  if (!text && !imageText) return null;

  const formats = [];
  if (/HDR10\+/i.test(text)) formats.push("HDR10+");
  else if (/HDR10/i.test(text)) formats.push("HDR10");
  if (/HLG/i.test(text)) formats.push("HLG");
  if (/Dolby Vision/i.test(text) || /Dolby Vision/i.test(imageText)) formats.push("Dolby Vision");

  return formats.length ? formats : null;
}

function mapInput(features) {
  const text = joined(features, "INPUT");
  const hdmi = text.match(/HDMI\s*x\s*(\d+)/i);
  const usb = text.match(/USB\s*x\s*(\d+)/i);
  return {
    hdmi: hdmi ? Number(hdmi[1]) : null,
    usb: usb ? Number(usb[1]) : null,
  };
}

// Only ever "true" - a missing row is not proof the feature is absent.
function mapBoolean(features, names, pattern) {
  const text = names.map((n) => joined(features, n)).join(" | ");
  return pattern.test(text) || null;
}

function lgToFields(features) {
  const { hdmi, usb } = mapInput(features);
  const gamingText = ["OTHER FUNCTIONS", "IMAGE TECHNOLOGY", "INPUT"];

  const fields = {
    resolution: mapResolution(features),
    technology: mapTechnology(features),
    os: mapOs(features),
    hdmi,
    usb,
    pictureProcessor: first(features, "VIDEO PROCESSOR") || first(features, "PROCESSOR"),
    audioPower: firstNumber(joined(features, "AUDIO POWER")),
    hdrFormats: mapHdrFormats(features),
    dolbyAtmos: mapBoolean(features, ["SOUND TECHNOLOGY"], /Dolby Atmos/i),
    vrr: mapBoolean(features, gamingText, /\bVRR\b|variable refresh/i),
    allm: mapBoolean(features, gamingText, /\bALLM\b|auto low latency/i),
  };

  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const lg = JSON.parse(fs.readFileSync(LG_FILE, "utf8"));

  const fills = {};
  const conflicts = {};
  const filled = [];
  const disputed = [];
  const skipped = [];

  const updated = master.map((tv) => {
    const entry = lg[tv.id];
    if (!entry || !entry.found || !entry.features) return tv;

    if (!sizeOk(tv, entry.features)) {
      skipped.push({ tv, entry });
      return tv;
    }

    const fields = lgToFields(entry.features);

    // HDR formats are merged, never replaced.
    if (fields.hdrFormats && Array.isArray(tv.hdrFormats) && tv.hdrFormats.length) {
      const merged = [...new Set([...tv.hdrFormats, ...fields.hdrFormats])];
      if (merged.length === tv.hdrFormats.length) delete fields.hdrFormats;
      else fields.hdrFormats = merged;
    }

    const toFill = {};
    const differs = {};

    for (const [key, value] of Object.entries(fields)) {
      if (JSON.stringify(tv[key]) === JSON.stringify(value)) continue;

      if (isBlank(key, tv[key])) {
        toFill[key] = { before: tv[key], after: value };
        fills[key] = (fills[key] || 0) + 1;
      } else {
        differs[key] = { ours: tv[key], technopolis: value };
        conflicts[key] = (conflicts[key] || 0) + 1;
      }
    }

    if (Object.keys(toFill).length) filled.push({ tv, entry, toFill });
    if (Object.keys(differs).length) disputed.push({ tv, entry, differs });

    const applied = {};
    for (const [key, { after }] of Object.entries(toFill)) applied[key] = after;
    for (const [key, { technopolis: value }] of Object.entries(differs)) {
      if (OVERWRITE_ALL || OVERWRITE_FIELDS.includes(key)) applied[key] = value;
    }

    if (!Object.keys(applied).length) return tv;

    const source = tv.specsSource
      ? tv.specsSource.includes("technopolis")
        ? tv.specsSource
        : `${tv.specsSource}+technopolis`
      : "technopolis";

    return { ...tv, ...applied, specsSource: source };
  });

  const pages = Object.values(lg).filter((e) => e.found).length;

  console.log(`technopolis.bg LG pages read: ${pages}`);
  console.log(`\nTVs with empty fields that would be filled: ${filled.length}`);
  console.log(`TVs where technopolis.bg disagrees with us: ${disputed.length}`);
  if (skipped.length) console.log(`Skipped (page size does not match): ${skipped.length}`);
  if (OVERWRITE_FIELDS.length) console.log(`\ntechnopolis.bg will also overwrite: ${OVERWRITE_FIELDS.join(", ")}`);

  console.log("\nFills per field:");
  Object.entries(fills).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(18)} ${v}`));

  console.log("\nDisagreements per field:");
  Object.entries(conflicts).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(18)} ${v}`));

  filled.slice(0, 4).forEach(({ tv, toFill }) => {
    console.log(`\n=== ${tv.brand} ${tv.model} (${tv.id})`);
    Object.entries(toFill).forEach(([k, { before, after }]) =>
      console.log(`    ${k.padEnd(17)} ${JSON.stringify(before).padEnd(12)} → ${JSON.stringify(after)}`)
    );
  });

  if (skipped.length) {
    console.log("\nSkipped (screen size mismatch):");
    skipped.forEach(({ tv, entry }) => console.log(`  ${tv.brand} ${tv.model} <${Object.values(entry.sources || {}).join(", ")}>`));
  }

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const lines = ["# LG (technopolis.bg) report\n", `Date: ${new Date().toISOString().slice(0, 10)}\n`];
  lines.push(`- Pages read: ${pages}`);
  lines.push(`- Would get new data: ${filled.length}`);
  lines.push(`- Disagreements: ${disputed.length}\n`);

  lines.push("## Fills per field\n");
  Object.entries(fills).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
  lines.push("\n## Disagreements per field\n");
  Object.entries(conflicts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));

  lines.push("\n## All fills\n");
  filled.forEach(({ tv, entry, toFill }) => {
    lines.push(`### ${tv.brand} ${tv.model} (${tv.id})`);
    lines.push(`<${Object.values(entry.sources || {}).join(", ")}>`);
    Object.entries(toFill).forEach(([k, { before, after }]) =>
      lines.push(`- ${k}: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``)
    );
    lines.push("");
  });

  lines.push("\n## All disagreements (left unchanged unless overwritten)\n");
  disputed.forEach(({ tv, entry, differs }) => {
    lines.push(`### ${tv.brand} ${tv.model} (${tv.id})`);
    lines.push(`<${Object.values(entry.sources || {}).join(", ")}>`);
    Object.entries(differs).forEach(([k, { ours, technopolis: v }]) =>
      lines.push(`- ${k}: ours \`${JSON.stringify(ours)}\` | technopolis \`${JSON.stringify(v)}\``)
    );
    lines.push("");
  });

  const reportFile = path.join(REPORT_DIR, "lg-report.md");
  fs.writeFileSync(reportFile, lines.join("\n"));
  console.log(`\nReport: ${path.relative(process.cwd(), reportFile)}`);

  if (!WRITE) {
    console.log("\nPreview only. Nothing was written. Use --write to apply.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(DATA_DIR, `masterTvs.before-lg-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${path.relative(process.cwd(), backupFile)}`);
  console.log(`Updated: ${path.relative(process.cwd(), MASTER_FILE)}`);
}

main();
