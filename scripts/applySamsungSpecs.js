// Compares the samsung.com/mk data in src/Data/samsungSpecs.json with
// masterTvs.json.
//
// Previews by default and writes a report to reports/. Use --write to change
// masterTvs.json (a backup is made first).
//
// Rules (same as the EPREL script):
//   - Only fields that are empty on our side ("—", 0, null, []) are filled.
//   - Existing values are never silently replaced; differences are reported.
//     Use --overwrite-fields a,b to trust Samsung for specific fields.
//   - Gaming/audio switches are only ever set to true. Samsung listing no VRR
//     row does not prove the TV lacks VRR, so we never write false.
//
// Usage:
//   node scripts/applySamsungSpecs.js
//   node scripts/applySamsungSpecs.js --write
//   node scripts/applySamsungSpecs.js --overwrite-fields hdmi,usb --write

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const SAMSUNG_FILE = path.join(DATA_DIR, "samsungSpecs.json");
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

// The Macedonian pages are only half translated, so the same "yes" appears as
// "Да", "Yes" or "Support". Note \b is ASCII-only in JavaScript and would
// never match after Cyrillic "Да".
const isYes = (value) => {
  const text = String(value || "").trim();
  if (!text || /^(Не|No|-|–|N\/A)$/i.test(text)) return false;
  return /^(Да|Yes|Support|Поддр)/i.test(text);
};

// European spec sheets say 50/100 Hz for 60/120 Hz panels.
function normalizeHz(hz) {
  if (hz === 50) return 60;
  if (hz === 100) return 120;
  return hz;
}

function isBlank(field, value) {
  if (value === null || value === undefined || value === "") return true;
  if (value === "—" || value === "-") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (["hdmi", "usb", "audioPower", "refreshRate", "size"].includes(field)) {
    return value === 0;
  }
  return false;
}

// ============================================================
// SAMSUNG -> OUR FIELDS
// ============================================================

function mapRefreshRate(specs) {
  const text = specs["Стапка на освежување"] || "";
  if (!text) return null;

  // "165 Hz VRR (100 Hz Native)" - the native rate is the panel's own.
  const native = text.match(/\((\d+)\s*Hz\s*Native\)/i);
  const value = native ? Number(native[1]) : firstNumber(text);

  return value ? normalizeHz(value) : null;
}

function mapResolution(specs) {
  const text = specs["Резолуција"] || "";
  if (/7680\s*x\s*4320/.test(text)) return "8K";
  if (/3840\s*x\s*2160/.test(text)) return "4K";
  if (/1920\s*x\s*1080/.test(text)) return "FHD";
  if (/(1366|1280)\s*x\s*(768|720)/.test(text)) return "HD Ready";
  return null;
}

function mapAudioChannels(specs) {
  // "2ch", "2.1ch", "4.2.2ch"
  const m = String(specs["Тип звучник"] || "").match(/(\d(?:\.\d){0,2})\s*ch/i);
  if (!m) return null;
  return m[1].includes(".") ? m[1] : `${m[1]}.0`;
}

function mapHdrFormats(specs) {
  const hdrPlus = specs["HDR 10+"];

  // Without an explicit "HDR 10+" row we cannot tell HDR10-only apart from a
  // page that simply does not list the row, and claiming HDR10-only would
  // throw away correct HDR10+/HLG data we already have.
  if (!hdrPlus) return null;

  const all = Object.values(specs).join(" | ");
  const formats = ["HDR10"];

  if (isYes(hdrPlus)) formats.push("HDR10+");
  if (/\bHLG\b/i.test(all)) formats.push("HLG");
  if (/Dolby Vision/i.test(all)) formats.push("Dolby Vision");

  return formats;
}

/*
 * The Macedonian site mixes languages in the processor name:
 * "Crystal Processor 4K", "Crystal процесор 4K" and even "Crystal Процесор 4К"
 * with a Cyrillic К. Normalised to one English spelling so the value is the
 * same for every TV.
 */
function cleanProcessor(value) {
  if (!value) return null;

  return value
    .replace(/[Пп]роцесор/g, "Processor")
    .replace(/\bПроцессор\b/g, "Processor")
    .replace(/4\u041A/g, "4K")   // Cyrillic К
    .replace(/8\u041A/g, "8K")
    .replace(/\s+/g, " ")
    .trim();
}

function mapOs(specs) {
  const text = specs["Оперативен систем"] || "";
  if (/tizen/i.test(text)) return "Tizen";
  if (/android|google tv/i.test(text)) return "Google TV";
  return null;
}

function samsungToFields(specs) {
  const freeSync = specs["FreeSync"];

  const fields = {
    resolution: mapResolution(specs),
    refreshRate: mapRefreshRate(specs),
    os: mapOs(specs),
    hdmi: firstNumber(specs["HDMI"]),
    usb: firstNumber(specs["USB"]),
    pictureProcessor: cleanProcessor(specs["Picture Engine"]),
    audioPower: firstNumber(specs["Излез за звук (RMS)"]),
    audioChannels: mapAudioChannels(specs),
    hdrFormats: mapHdrFormats(specs),
    // Only ever "yes" - an absent row is not proof of absence.
    dolbyAtmos: isYes(specs["Dolby Atmos"]) || null,
    vrr: isYes(specs["VRR"]) || null,
    allm: isYes(specs["Auto Game Mode (ALLM)"]) || null,
    freeSync: freeSync && !/^(Не|No|-)$/i.test(freeSync.trim()) ? true : null,
  };

  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const samsung = JSON.parse(fs.readFileSync(SAMSUNG_FILE, "utf8"));

  const fills = {};
  const conflicts = {};
  const filled = [];
  const disputed = [];
  const skipped = [];

  const updated = master.map((tv) => {
    const entry = samsung[tv.id];
    if (!entry || !entry.found || !entry.specs) return tv;

    if (entry.sizeOk === false) {
      skipped.push({ tv, entry });
      return tv;
    }

    const fields = samsungToFields(entry.specs);

    // HDR formats are merged, never replaced: Samsung confirming HDR10+ is
    // new information, but Samsung not listing HLG is not proof it is absent.
    if (fields.hdrFormats && Array.isArray(tv.hdrFormats) && tv.hdrFormats.length) {
      const merged = [...new Set([...tv.hdrFormats, ...fields.hdrFormats])];
      if (merged.length === tv.hdrFormats.length) {
        delete fields.hdrFormats;
      } else {
        fields.hdrFormats = merged;
      }
    }

    // Samsung usually gives the same processor name plus the word
    // "Processor" ("NQ4 AI Gen2" -> "NQ4 AI Gen2 Processor"), which is worth
    // taking for consistency. But sometimes it is shorter and drops the
    // generation ("NQ4 AI Gen2" -> "NQ4 AI Processor") - that loses
    // information, so ours is kept.
    if (fields.pictureProcessor && tv.pictureProcessor && tv.pictureProcessor !== "—") {
      const ours = tv.pictureProcessor.toLowerCase().replace(/\s+/g, " ").trim();
      const theirs = fields.pictureProcessor.toLowerCase().replace(/\s+/g, " ").trim();
      if (!theirs.includes(ours)) delete fields.pictureProcessor;
    }

    const toFill = {};
    const differs = {};

    for (const [key, value] of Object.entries(fields)) {
      if (JSON.stringify(tv[key]) === JSON.stringify(value)) continue;

      if (isBlank(key, tv[key])) {
        toFill[key] = { before: tv[key], after: value };
        fills[key] = (fills[key] || 0) + 1;
      } else {
        differs[key] = { ours: tv[key], samsung: value };
        conflicts[key] = (conflicts[key] || 0) + 1;
      }
    }

    if (Object.keys(toFill).length) filled.push({ tv, entry, toFill });
    if (Object.keys(differs).length) disputed.push({ tv, entry, differs });

    const applied = {};
    for (const [key, { after }] of Object.entries(toFill)) applied[key] = after;
    for (const [key, { samsung: value }] of Object.entries(differs)) {
      if (OVERWRITE_ALL || OVERWRITE_FIELDS.includes(key)) applied[key] = value;
    }

    if (!Object.keys(applied).length) return tv;

    const source = tv.specsSource
      ? tv.specsSource.includes("samsung")
        ? tv.specsSource
        : `${tv.specsSource}+samsung`
      : "samsung";

    return { ...tv, ...applied, specsSource: source };
  });

  const pages = Object.values(samsung).filter((e) => e.found).length;

  console.log(`Samsung product pages read: ${pages}`);
  console.log(`\nTVs with empty fields that would be filled: ${filled.length}`);
  console.log(`TVs where Samsung disagrees with us: ${disputed.length}`);
  if (skipped.length) console.log(`Skipped (page size does not match): ${skipped.length}`);
  if (OVERWRITE_FIELDS.length) console.log(`\nSamsung will also overwrite: ${OVERWRITE_FIELDS.join(", ")}`);

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

  const lines = ["# Samsung (samsung.com/mk) report\n", `Date: ${new Date().toISOString().slice(0, 10)}\n`];
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
    Object.entries(differs).forEach(([k, { ours, samsung: v }]) =>
      lines.push(`- ${k}: ours \`${JSON.stringify(ours)}\` | Samsung \`${JSON.stringify(v)}\``)
    );
    lines.push("");
  });

  const reportFile = path.join(REPORT_DIR, "samsung-report.md");
  fs.writeFileSync(reportFile, lines.join("\n"));
  console.log(`\nReport: ${path.relative(process.cwd(), reportFile)}`);

  if (!WRITE) {
    console.log("\nPreview only. Nothing was written. Use --write to apply.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(DATA_DIR, `masterTvs.before-samsung-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${path.relative(process.cwd(), backupFile)}`);
  console.log(`Updated: ${path.relative(process.cwd(), MASTER_FILE)}`);
}

main();
