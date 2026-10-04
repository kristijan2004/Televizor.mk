// Converts Icecat specs (src/Data/icecatSpecs.json, made by
// scripts/fetchIcecatSpecs.js) into masterTvs.json fields.
//
// By default this only PREVIEWS the changes. Nothing is written.
//
//   node scripts/applyIcecatSpecs.js                 # summary + 5 examples
//   node scripts/applyIcecatSpecs.js --show lg-65b62la samsung-qe55s90haexxh
//   node scripts/applyIcecatSpecs.js --write         # backup + update masterTvs.json
//
// Rule: a field is only changed when Icecat clearly provides a value.
// Otherwise the existing value is kept.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const ICECAT_FILE = path.join(DATA_DIR, "icecatSpecs.json");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const SHOW = args.includes("--show")
  ? args.slice(args.indexOf("--show") + 1).filter((a) => !a.startsWith("--"))
  : null;

// ============================================================
// HELPERS
// ============================================================

function get(specs, group, name) {
  const value = specs[group]?.[name];
  return value === undefined || value === "" ? null : String(value);
}

function isYes(value) {
  return value === "Yes";
}

function firstNumber(value) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// ============================================================
// FIELD MAPPING
// ============================================================

function mapTechnology(specs) {
  const tech = (get(specs, "Display", "Display technology") || "").toLowerCase();
  const backlight = (get(specs, "Display", "LED backlighting type") || "").toLowerCase();

  if (!tech && !backlight) return null;

  if (tech.includes("oled")) return "OLED";
  if (tech.includes("micro rgb")) return "Micro RGB";
  if (tech.includes("neo qled")) return "Neo QLED";
  if (tech.includes("mini led") || backlight.includes("mini led")) return "Mini LED";
  if (tech.includes("qned")) return "QNED";
  if (tech.includes("qled")) return "QLED";
  if (tech.includes("nanocell")) return "NanoCell";
  if (tech.includes("uled")) return "ULED";
  if (/^(led|dled|lcd)$/.test(tech)) return "LED";

  return null;
}

function mapResolution(specs) {
  const hdType = get(specs, "Display", "HD type");

  if (hdType === "8K Ultra HD") return "8K";
  if (hdType === "4K Ultra HD") return "4K";
  if (hdType === "Full HD") return "FHD";
  if (hdType === "HD" || hdType === "HD+") return "HD Ready";

  return null;
}

// European listings often say 50/100 Hz for 60/120 Hz panels.
function normalizeHz(hz) {
  if (hz === 50) return 60;
  if (hz === 100) return 120;
  return hz;
}

function mapRefreshRate(specs) {
  const native = firstNumber(get(specs, "Display", "Native refresh rate"));
  if (native) return normalizeHz(native);

  const supported = get(specs, "Display", "Display refresh rates supported");
  if (!supported) return null;

  const rates = (supported.match(/\d+/g) || []).map(Number);
  return rates.length ? normalizeHz(Math.max(...rates)) : null;
}

const OS_NAMES = {
  Tizen: "Tizen",
  WebOS: "webOS",
  "Google TV": "Google TV",
  "Android TV": "Android TV",
  VIDAA: "VIDAA",
  "Titan OS": "Titan OS",
  HomeOS: "HomeOS",
  SAPHI: "SAPHI",
};

function mapOs(specs) {
  const os = get(specs, "Smart TV", "Operating system installed");

  if (os && OS_NAMES[os]) return OS_NAMES[os];
  if (os === "Not supported" || get(specs, "Smart TV", "Smart TV") === "No") {
    return "Non-Smart";
  }

  return null;
}

// HDR10 is the base format every HDR TV supports, so it is always
// included when Icecat says the TV supports HDR (Samsung often lists
// only HDR10+ or no formats at all).
function mapHdrFormats(specs) {
  const text = get(specs, "Performance", "High Dynamic Range (HDR) technology") || "";
  const hdrSupported = isYes(get(specs, "Performance", "High Dynamic Range (HDR) supported"));

  if (!text && !hdrSupported) return null;

  const formats = [];

  if (hdrSupported || /\(HDR10\)|High Dynamic Range 10 \(/i.test(text)) formats.push("HDR10");
  if (/HDR10\+|HDR10 Plus|HDR 10\+/i.test(text)) formats.push("HDR10+");
  if (/HLG|Hybrid Log-Gamma/i.test(text)) formats.push("HLG");
  if (/Dolby Vision/i.test(text)) formats.push("Dolby Vision");

  return formats.length ? formats : null;
}

function mapUsb(specs) {
  const keys = [
    "USB 2.0 ports quantity",
    "USB 3.2 Gen 1 (3.1 Gen 1) Type-A ports quantity",
    "USB 3.2 Gen 1 (3.1 Gen 1) Type-C ports quantity",
  ];
  const values = keys
    .map((key) => firstNumber(get(specs, "Ports & interfaces", key)))
    .filter((value) => value !== null);

  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function mapPictureProcessor(specs) {
  return (
    get(specs, "Performance", "Picture processor") ||
    get(specs, "Technical details", "Processor") ||
    null
  );
}

function mapBrightness(specs) {
  const value = firstNumber(get(specs, "Display", "Display brightness"));
  return value ? `${value} cd/m²` : null;
}

function mapAudioChannels(specs) {
  const match = (get(specs, "Audio", "Audio output channels") || "").match(
    /^(\d(?:\.\d){1,2})/
  );
  return match ? match[1] : null;
}

// Returns only the fields Icecat clearly provides.
function icecatToFields(specs) {
  const games = get(specs, "Performance", "Game features") || "";
  const hdrSupported = get(specs, "Performance", "High Dynamic Range (HDR) supported");
  const hdrFormats = mapHdrFormats(specs);
  const decoders = get(specs, "Audio", "Audio decoders");
  const freeSync = get(specs, "Performance", "AMD FreeSync");
  const gSync = get(specs, "Performance", "NVIDIA G-SYNC");
  const year = firstNumber(get(specs, "Design", "Introduction year"));

  const fields = {
    technology: mapTechnology(specs),
    resolution: mapResolution(specs),
    refreshRate: mapRefreshRate(specs),
    year: year && year >= 2015 && year <= 2030 ? year : null,
    os: mapOs(specs),
    hdr: hdrSupported ? isYes(hdrSupported) : null,
    hdrFormats,
    dolbyVision: hdrFormats ? hdrFormats.includes("Dolby Vision") : null,
    hdmi: firstNumber(get(specs, "Ports & interfaces", "HDMI ports quantity")),
    usb: mapUsb(specs),
    vrr: games ? /Variable Refresh Rate|\bVRR\b/i.test(games) : null,
    allm: games ? /Auto Low Latency Mode|\bALLM\b/i.test(games) : null,
    freeSync: freeSync ? isYes(freeSync) : null,
    gSync: gSync ? isYes(gSync) : null,
    pictureProcessor: mapPictureProcessor(specs),
    brightness: mapBrightness(specs),
    audioPower: firstNumber(get(specs, "Audio", "RMS rated power")),
    audioChannels: mapAudioChannels(specs),
    dolbyAtmos: decoders ? /Dolby Atmos/i.test(decoders) : null,
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null)
  );
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const icecat = JSON.parse(fs.readFileSync(ICECAT_FILE, "utf8"));

  const changes = [];
  const fieldCounts = {};

  const updated = master.map((tv) => {
    const entry = icecat[tv.id];
    if (!entry?.found || entry.needsReview) return tv;

    const fields = icecatToFields(entry.specs);
    const diff = {};

    for (const [key, value] of Object.entries(fields)) {
      if (JSON.stringify(tv[key]) !== JSON.stringify(value)) {
        diff[key] = { before: tv[key], after: value };
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      }
    }

    if (Object.keys(diff).length) {
      changes.push({ tv, title: entry.title, diff });
    }

    // Marks the TV as having verified specs (used by src/lib/tvSpecs.js).
    return { ...tv, ...fields, specsSource: "icecat" };
  });

  console.log(`TVs that would change: ${changes.length} / ${master.length}\n`);
  console.log("Changes per field:");
  for (const [key, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(17)} ${count}`);
  }

  const examples = SHOW
    ? changes.filter((change) => SHOW.includes(change.tv.id))
    : changes.filter((_, index) => index % Math.ceil(changes.length / 5) === 0);

  for (const { tv, title, diff } of examples) {
    console.log(`\n=== ${tv.brand} ${tv.model}  (${tv.id})`);
    console.log(`    Icecat: ${title}`);
    for (const [key, { before, after }] of Object.entries(diff)) {
      console.log(
        `    ${key.padEnd(17)} ${JSON.stringify(before).padEnd(22)} → ${JSON.stringify(after)}`
      );
    }
  }

  if (!WRITE) {
    console.log("\nPreview only. Nothing was written. Use --write to apply.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = path.join(DATA_DIR, `masterTvs.before-icecat-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${backupFile}`);
  console.log(`Updated: ${MASTER_FILE}`);
}

main();
