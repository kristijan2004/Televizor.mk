// Compares the philips.co.uk / philips.bg data in src/Data/philipsSpecs.json
// with masterTvs.json.
//
// Previews by default and writes a report to reports/. Use --write to change
// masterTvs.json (a backup is made first).
//
// Same rules as the Samsung and EPREL scripts: only empty fields are filled,
// differences are reported rather than applied unless --overwrite-fields names
// them, HDR formats are merged instead of replaced, and the gaming/audio
// switches are only ever set to true.
//
// Usage:
//   node scripts/applyPhilipsSpecs.js
//   node scripts/applyPhilipsSpecs.js --write
//   node scripts/applyPhilipsSpecs.js --overwrite-fields hdmi,usb --write

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const PHILIPS_FILE = path.join(DATA_DIR, "philipsSpecs.json");
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

/* The UK site is used where possible, but ten models are only on the
 * Bulgarian one, so every label is looked up in both languages. */
function pick(specs, labels) {
  for (const label of labels) {
    if (specs[label] !== undefined && specs[label] !== "") return specs[label];
  }
  return null;
}

const L = {
  hdmi: ["Number of HDMI connections", "Брой HDMI връзки"],
  usb: ["Number of USBs", "Брой USB портове"],
  audioPower: ["Output power (RMS)", "Изходна мощност (RMS)"],
  speakers: ["Speaker configuration", "Конфигурация на високоговорителите"],
  processor: ["Picture engine", "Машина за обработка на изображението"],
  os: ["OS", "Операционна система"],
  hdr: ["HDR", "HDR съвместимост"],
  gaming: ["Gaming", "Игри"],
  hdmi21: ["HDMI 2.1 features", "HDMI 2.1 функции"],
  codec: ["Codec", "Кодек"],
  resolution: ["Panel resolution", "Разделителна способност на екрана"],
  panel: ["Panel technology used", "Използвана технология на панела"],
  display: ["Display", "Дисплей"],
};

function isBlank(field, value) {
  if (value === null || value === undefined || value === "") return true;
  if (value === "—" || value === "-") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (["hdmi", "usb", "audioPower", "size"].includes(field)) return value === 0;
  return false;
}

// ============================================================
// PHILIPS -> OUR FIELDS
// ============================================================

function mapResolution(specs) {
  const text = pick(specs, L.resolution) || pick(specs, L.display) || "";
  if (/7680\s*x\s*4320/.test(text)) return "8K";
  if (/3840\s*x\s*2160/.test(text)) return "4K";
  if (/1920\s*x\s*1080/.test(text)) return "FHD";
  if (/(1366|1280)\s*x\s*(768|720)/.test(text)) return "HD Ready";
  return null;
}

function mapTechnology(specs) {
  const text = `${pick(specs, L.panel) || ""} ${pick(specs, L.display) || ""}`;
  if (/oled/i.test(text)) return "OLED";
  if (/mini\s*led/i.test(text)) return "Mini LED";
  if (/qled/i.test(text)) return "QLED";
  if (/led/i.test(text)) return "LED";
  return null;
}

function mapOs(specs) {
  const text = pick(specs, L.os) || "";
  if (/titan/i.test(text)) return "Titan OS";
  if (/google\s*tv/i.test(text)) return "Google TV";
  if (/android/i.test(text)) return "Android TV";
  if (/saphi/i.test(text)) return "SAPHI";
  return null;
}

function mapAudioChannels(specs) {
  const text = pick(specs, L.speakers) || "";
  const m = text.match(/(\d)\s*x\s*\d+(?:\.\d+)?\s*W/i);
  if (!m) return null;
  return /subwoofer|сабуфер/i.test(text) ? `${m[1]}.1` : `${m[1]}.0`;
}

function mapHdrFormats(specs) {
  const text = pick(specs, L.hdr);
  if (!text) return null;

  const formats = [];
  if (/HDR10(?!\+)/i.test(text) || /\bHDR\b/i.test(text)) formats.push("HDR10");
  if (/HDR10\+/i.test(text)) formats.push("HDR10+");
  if (/HLG/i.test(text)) formats.push("HLG");
  if (/Dolby Vision/i.test(text)) formats.push("Dolby Vision");

  return formats.length ? formats : null;
}

function philipsToFields(specs) {
  const gaming = `${pick(specs, L.gaming) || ""} ${pick(specs, L.hdmi21) || ""}`;
  const codec = pick(specs, L.codec) || "";

  const fields = {
    resolution: mapResolution(specs),
    technology: mapTechnology(specs),
    os: mapOs(specs),
    hdmi: firstNumber(pick(specs, L.hdmi)),
    usb: firstNumber(pick(specs, L.usb)),
    pictureProcessor: pick(specs, L.processor),
    audioPower: firstNumber(pick(specs, L.audioPower)),
    audioChannels: mapAudioChannels(specs),
    hdrFormats: mapHdrFormats(specs),
    // Only ever "yes" - a missing row is not proof the feature is absent.
    vrr: /\bVRR\b/i.test(gaming) || null,
    allm: /\bALLM\b/i.test(gaming) || null,
    dolbyAtmos: /Dolby Atmos/i.test(codec) || null,
  };

  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const philips = JSON.parse(fs.readFileSync(PHILIPS_FILE, "utf8"));

  const fills = {};
  const conflicts = {};
  const filled = [];
  const disputed = [];
  const skipped = [];

  const updated = master.map((tv) => {
    const entry = philips[tv.id];
    if (!entry || !entry.found || !entry.specs) return tv;

    if (entry.sizeOk === false) {
      skipped.push({ tv, entry });
      return tv;
    }

    const fields = philipsToFields(entry.specs);

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
        differs[key] = { ours: tv[key], philips: value };
        conflicts[key] = (conflicts[key] || 0) + 1;
      }
    }

    if (Object.keys(toFill).length) filled.push({ tv, entry, toFill });
    if (Object.keys(differs).length) disputed.push({ tv, entry, differs });

    const applied = {};
    for (const [key, { after }] of Object.entries(toFill)) applied[key] = after;
    for (const [key, { philips: value }] of Object.entries(differs)) {
      if (OVERWRITE_ALL || OVERWRITE_FIELDS.includes(key)) applied[key] = value;
    }

    if (!Object.keys(applied).length) return tv;

    const source = tv.specsSource
      ? tv.specsSource.includes("philips")
        ? tv.specsSource
        : `${tv.specsSource}+philips`
      : "philips";

    return { ...tv, ...applied, specsSource: source };
  });

  const pages = Object.values(philips).filter((e) => e.found).length;

  console.log(`Philips product pages read: ${pages}`);
  console.log(`\nTVs with empty fields that would be filled: ${filled.length}`);
  console.log(`TVs where Philips disagrees with us: ${disputed.length}`);
  if (skipped.length) console.log(`Skipped (page size does not match): ${skipped.length}`);
  if (OVERWRITE_FIELDS.length) console.log(`\nPhilips will also overwrite: ${OVERWRITE_FIELDS.join(", ")}`);

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

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const lines = ["# Philips report\n", `Date: ${new Date().toISOString().slice(0, 10)}\n`];
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
    lines.push(`<${entry.url}>`);
    Object.entries(toFill).forEach(([k, { before, after }]) =>
      lines.push(`- ${k}: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``)
    );
    lines.push("");
  });

  lines.push("\n## All disagreements (left unchanged unless overwritten)\n");
  disputed.forEach(({ tv, entry, differs }) => {
    lines.push(`### ${tv.brand} ${tv.model} (${tv.id})`);
    lines.push(`<${entry.url}>`);
    Object.entries(differs).forEach(([k, { ours, philips: v }]) =>
      lines.push(`- ${k}: ours \`${JSON.stringify(ours)}\` | Philips \`${JSON.stringify(v)}\``)
    );
    lines.push("");
  });

  const reportFile = path.join(REPORT_DIR, "philips-report.md");
  fs.writeFileSync(reportFile, lines.join("\n"));
  console.log(`\nReport: ${path.relative(process.cwd(), reportFile)}`);

  if (!WRITE) {
    console.log("\nPreview only. Nothing was written. Use --write to apply.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(DATA_DIR, `masterTvs.before-philips-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${path.relative(process.cwd(), backupFile)}`);
  console.log(`Updated: ${path.relative(process.cwd(), MASTER_FILE)}`);
}

main();
