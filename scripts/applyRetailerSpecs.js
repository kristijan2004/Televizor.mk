// Converts retailer spec lines (src/Data/retailerSpecsRaw.json, made by
// scripts/fetchRetailerSpecs.js) into masterTvs.json fields.
//
// By default this only PREVIEWS the changes. Nothing is written.
//
//   node scripts/applyRetailerSpecs.js                 # summary + examples
//   node scripts/applyRetailerSpecs.js --show aiwa-50n27 sony-k65xr70paep
//   node scripts/applyRetailerSpecs.js --write         # backup + update masterTvs.json
//
// Rules:
// - Only TVs without verified specs (no `specsSource`) are touched.
// - A field is only changed when the retailer clearly states a value.
//   Otherwise the existing value is kept.
// - Neptun is preferred over Anhoch, Anhoch over Setec, and Setec over
//   DDStore, when several retailers list the same field.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const RAW_FILE = path.join(DATA_DIR, "retailerSpecsRaw.json");
const DDSTORE_FILE = path.join(DATA_DIR, "ddstoreTvs.json");

const STORE_ORDER = ["Neptun", "Anhoch", "Setec", "DDStore"];

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const SHOW = args.includes("--show")
  ? args.slice(args.indexOf("--show") + 1).filter((a) => !a.startsWith("--"))
  : null;

// ============================================================
// LINE HELPERS
// ============================================================

// "•HDMI приклучоци: 3x HDMI 2.1" → { key: "hdmi приклучоци", value: "3x HDMI 2.1" }
function parseLine(line) {
  const index = line.indexOf(":");
  if (index === -1) return { key: "", value: line.trim(), line };

  return {
    key: line.slice(0, index).replace(/^[•\-\s]+/, "").trim().toLowerCase(),
    value: line.slice(index + 1).trim(),
    line,
  };
}

const NEGATIVE = /^(не|no|нема|none|-|—|x)$/i;

function isNegative(value) {
  return NEGATIVE.test(String(value).trim());
}

function findValue(lines, keyPattern, valuePattern = null) {
  for (const entry of lines) {
    if (!keyPattern.test(entry.key)) continue;
    if (!entry.value || isNegative(entry.value)) continue;
    if (valuePattern && !valuePattern.test(entry.value)) continue;
    return entry.value;
  }
  return null;
}

// Feature that may appear as "VRR: Да", "HDMI 1: ALLM / VRR" or "Gaming: VRR, ALLM".
// Returns true / false (explicit "Не") / null (not mentioned).
function featureFlag(lines, pattern) {
  let result = null;

  for (const entry of lines) {
    if (pattern.test(entry.key)) {
      if (isNegative(entry.value)) {
        if (result === null) result = false;
      } else {
        return true;
      }
    } else if (pattern.test(entry.value)) {
      return true;
    }
  }

  return result;
}

// ============================================================
// FIELD MAPPING
// ============================================================

function mapTechnology(lines) {
  const value = findValue(
    lines,
    /тип на (дисплеј|панел|екран|екранот)|технологија на панел|display technology|display type|panel type|^backlight|back light unit|позадинско|led технологија|^технологија$/
  );
  if (!value) return null;

  const text = value.toLowerCase();

  if (text.includes("oled")) return "OLED";
  if (text.includes("micro rgb")) return "Micro RGB";
  if (text.includes("neo qled")) return "Neo QLED";
  if (/mini[\s-]?rgb|rgb\s*mini[\s-]?led/.test(text)) return "RGB Mini LED";
  if (/mini[\s-]?led/.test(text)) return "Mini LED";
  if (text.includes("qned")) return "QNED";
  if (/q[\s-]?led/.test(text)) return "QLED";
  if (/nano\s?cell/.test(text)) return "NanoCell";
  if (/\b(d-?led|direct led|led|lcd|edge led)\b/.test(text)) return "LED";

  return null;
}

function mapResolution(lines) {
  const value = findValue(lines, /резолуција|resolution|квалитет на слика/);
  if (!value) return null;

  const text = value.replace(/[.\s]/g, "").toLowerCase();

  if (/7680|8k/.test(text)) return "8K";
  if (/3840|4k|uhd/.test(text)) return "4K";
  if (/1920|fhd|fullhd/.test(text)) return "FHD";
  if (/1366|1280|hdready|^hd$/.test(text)) return "HD Ready";

  return null;
}

function mapRefreshRate(lines) {
  const value = findValue(
    lines,
    /refresh|освежување|осфежување/,
    /\d+\s*hz/i
  );
  if (!value) return null;

  const hz = Number(value.match(/(\d+)\s*hz/i)[1]);
  if (hz === 50) return 60;
  if (hz === 100) return 120;
  return hz >= 50 && hz <= 300 ? hz : null;
}

const OS_PATTERNS = [
  [/webos/i, "webOS"],
  [/tizen/i, "Tizen"],
  [/google\s*tv/i, "Google TV"],
  // Setec headlines: "Google SMART UltraHD LED TV", "4K UltraHD Google OLED TV"
  [/google\s+(smart|(mini\s?)?led|oled|qled)/i, "Google TV"],
  [/android/i, "Android TV"],
  [/vidaa/i, "VIDAA"],
  [/\btitan\b/i, "Titan OS"], // whole word, not "titanium"
  [/whale/i, "Whale OS"],
  [/fire\s*tv/i, "Fire TV"],
  [/linux/i, "Smart TV (Linux)"],
];

function mapOs(lines) {
  const value = findValue(
    lines,
    /оперативен систем|operating system|^os$|^smart tv$|smart tv систем|smart os|^софтвер|^platform/
  );

  // "Smart TV систем: Не" (DDStore) — explicitly not a smart TV.
  if (!value) {
    const notSmart = lines.some(
      (entry) => /^smart tv( систем)?$/.test(entry.key) && isNegative(entry.value)
    );
    return notSmart ? "Non-Smart" : null;
  }

  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(value)) return name;
  }

  return null;
}

function mapHdrFormats(lines) {
  const formats = new Set();

  for (const entry of lines) {
    if (entry.value && isNegative(entry.value)) continue;
    const text = entry.line;

    if (/HDR\s?10(?!\s?\+)(?!\s?Plus)/i.test(text)) formats.add("HDR10");
    if (/HDR\s?10\s?(\+|Plus)/i.test(text)) formats.add("HDR10+");
    if (/\bHLG\b|Hybrid Log/i.test(text)) formats.add("HLG");
    if (/Dolby Vision/i.test(text)) formats.add("Dolby Vision");
  }

  if (!formats.size) return null;

  // HDR10 is the base format every HDR TV supports.
  formats.add("HDR10");

  return ["HDR10", "HDR10+", "HLG", "Dolby Vision"].filter((f) => formats.has(f));
}

function mapHdr(lines, hdrFormats) {
  if (hdrFormats) return true;

  const flag = featureFlag(lines, /^hdr$|high dynamic range|тип на hdr|hdr формати/i);
  return flag;
}

// "3", "3x HDMI 2.1", "HDMI x2", "4 x HDMI"
function countPorts(lines, name) {
  const keyPattern = new RegExp(`^${name}(\\s|$)|^${name} (приклучоци|inputs|ports)|${name} приклучоци`, "i");

  for (const entry of lines) {
    if (!keyPattern.test(entry.key) || isNegative(entry.value)) continue;

    const match =
      entry.value.match(/^(\d)\s*(x|×|$|\s)/i) ||
      entry.value.match(new RegExp(`(\\d)\\s*[x×]\\s*${name}`, "i")) ||
      entry.value.match(new RegExp(`${name}\\s*[x×]\\s*(\\d)`, "i"));

    if (match) return Number(match[1]);
  }

  // Count anywhere: "4 x HDMI" in a connections line.
  for (const entry of lines) {
    const match =
      entry.line.match(new RegExp(`(\\d)\\s*[x×]\\s*${name}`, "i")) ||
      entry.line.match(new RegExp(`${name}\\s*[x×]\\s*(\\d)`, "i"));
    if (match) return Number(match[1]);
  }

  return null;
}

// "2x10W" → 20, "2 × 10 W" → 20, "2*10W" → 20, "20W" → 20
function mapAudioPower(lines) {
  const value = findValue(
    lines,
    /audio output|аудиомоќност|аудио моќност|вкупна аудиомоќност|моќност на звук|излез за звук|sound output|internal speaker powers|^sound out$|^audio$|^звук$|^звучници$|^speakers?$|speaker system|аудиосистем|аудио систем/,
    /\d+\s*w/i
  );
  if (!value) return null;

  const multiplied = value.match(/(\d)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*w/i);
  if (multiplied) {
    return Number(multiplied[1]) * Number(multiplied[2].replace(",", "."));
  }

  // "10 W + 10 W"
  const parts = value.match(/\d+(?:[.,]\d+)?\s*w\s*\+\s*\d+(?:[.,]\d+)?\s*w/i);
  if (parts) {
    return (parts[0].match(/\d+(?:[.,]\d+)?/g) || [])
      .map((n) => Number(n.replace(",", ".")))
      .reduce((sum, n) => sum + n, 0);
  }

  // "2.5 W x 2" (count after the wattage)
  const reversed = value.match(/(\d+(?:[.,]\d+)?)\s*w\s*[x×*]\s*(\d)\b/i);
  if (reversed) {
    return Number(reversed[1].replace(",", ".")) * Number(reversed[2]);
  }

  const single = value.match(/(\d+(?:[.,]\d+)?)\s*w/i);
  const watts = single ? Number(single[1].replace(",", ".")) : null;
  return watts && watts > 0 && watts <= 200 ? watts : null;
}

function mapAudioChannels(lines) {
  for (const entry of lines) {
    // "Virtual 9.1.2ch" is simulated surround, not the real speakers.
    if (/virtual/i.test(entry.line)) continue;

    const match =
      entry.line.match(/\b(\d\.\d(?:\.\d)?)\s*(ch\b|channel|канал)/i) ||
      entry.line.match(/sound system\s*\((\d\.\d(?:\.\d)?)\)/i); // Setec
    if (match) return match[1];
  }
  return null;
}

// Only real picture processors, not CPU descriptions like "Quad Core".
function mapPictureProcessor(lines) {
  const explicit = findValue(lines, /picture processor|процесор на слика|picture engine/);
  if (explicit) return explicit;

  const generic = findValue(
    lines,
    /^процесор$|^processor$/,
    /α|alpha|xr|x1|nq|ai processor|pixel|quantum|hi-view|aipq|engine/i
  );
  return generic && !/core|ghz/i.test(generic) ? generic : null;
}

function mapBrightness(lines) {
  const value = findValue(lines, /brightness|осветленост/, /\d{3,4}/);
  if (!value) return null;

  const number = value.match(/\d{3,4}/)[0];
  return `${number} cd/m²`;
}

function mapSize(lines) {
  const value = findValue(lines, /големина|screen size|^size$|дијагонала/, /\d{2,3}\s*("|”|инч|inch)/i);
  if (!value) return null;
  return Number(value.match(/(\d{2,3})\s*("|”|инч|inch)/i)[1]);
}

// Returns only the fields the retailer clearly provides.
function linesToFields(rawLines, tv) {
  const lines = rawLines.map(parseLine);
  const hdrFormats = mapHdrFormats(lines);
  const dolbyVisionFlag = featureFlag(lines, /dolby vision/i);

  const fields = {
    size: tv.size ? null : mapSize(lines),
    technology: mapTechnology(lines),
    resolution: mapResolution(lines),
    refreshRate: mapRefreshRate(lines),
    os: mapOs(lines),
    hdr: mapHdr(lines, hdrFormats),
    hdrFormats,
    dolbyVision: dolbyVisionFlag,
    hdmi: countPorts(lines, "HDMI"),
    usb: countPorts(lines, "USB"),
    vrr: featureFlag(lines, /\bVRR\b|variable refresh/i),
    allm: featureFlag(lines, /\bALLM\b|auto low latency/i),
    freeSync: featureFlag(lines, /freesync/i),
    gSync: featureFlag(lines, /g-?sync/i),
    pictureProcessor: mapPictureProcessor(lines),
    brightness: mapBrightness(lines),
    audioPower: mapAudioPower(lines),
    audioChannels: mapAudioChannels(lines),
    dolbyAtmos: featureFlag(lines, /dolby\W{0,2}\s*atmos/i), // also "Dolby™ Atmos"
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null)
  );
}

// ============================================================
// SETEC (free text)
// ============================================================
//
// Setec lists specs as free-text lines, e.g.:
//   SAMSUNG QE75QN900CTXXH
//   75" (189cm) 8K NEO QLED Smart TV
//   Resolution: 7680 x 4320 pixels
//   6.2.4CH speaker
//   Connections: 4 x HDMI
//
// The second line is a short headline with size, resolution and panel type.

// Lines about power consumption or the power supply mention W/Hz too.
const POWER_LINE = /consumption|power supply|потрошувачка|напојување|standby|\bAC\b|~/i;

function setecTechnology(headline) {
  return mapTechnology([{ key: "тип на дисплеј", value: headline, line: headline }]);
}

function setecResolution(headline, lines) {
  const explicit = mapResolution(lines);
  if (explicit) return explicit;

  const text = headline.toLowerCase();
  if (/\b8k\b/.test(text)) return "8K";
  if (/\b(4k|uhd|ultra hd)\b/.test(text)) return "4K";
  if (/full\s?hd|\bfhd\b/.test(text)) return "FHD";
  if (/hd\s?ready/.test(text)) return "HD Ready";
  return null;
}

function setecRefreshRate(lines) {
  for (const { line } of lines) {
    if (POWER_LINE.test(line)) continue;
    // "Motion Xcelerator 144 Hz" is Samsung's name for the refresh rate.
    if (!/refresh|освежување|native|motion xcelerator/i.test(line)) continue;

    // "120 Hz" or Hisense's "180 High Refresh Rate"
    const match = line.match(/(\d{2,3})\s*(hz|high refresh)/i);
    if (!match) continue;

    const hz = Number(match[1]);
    if (hz === 50) return 60;
    if (hz === 100) return 120;
    if (hz >= 60 && hz <= 300) return hz;
  }
  return null;
}

function setecOs(lines) {
  for (const { line } of lines) {
    if (/google (cast|assistant|home)|chromecast/i.test(line) && !/google\s*tv/i.test(line)) {
      continue;
    }
    for (const [pattern, name] of OS_PATTERNS) {
      if (pattern.test(line)) return name;
    }
  }
  return null;
}

function setecAudioPower(lines) {
  for (const { line } of lines) {
    if (POWER_LINE.test(line)) continue;
    if (!/sound|audio|speaker|звук|звучници|rms|output/i.test(line)) continue;

    const multiplied = line.match(/(\d)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*w\b/i);
    if (multiplied) {
      return Number(multiplied[1]) * Number(multiplied[2].replace(",", "."));
    }

    const reversed = line.match(/(\d+(?:[.,]\d+)?)\s*w\s*[x×*]\s*(\d)\b/i);
    if (reversed) {
      return Number(reversed[1].replace(",", ".")) * Number(reversed[2]);
    }

    const single = line.match(/(\d+(?:[.,]\d+)?)\s*w\b/i);
    if (single) {
      const watts = Number(single[1].replace(",", "."));
      if (watts > 0 && watts <= 200) return watts;
    }
  }
  return null;
}

// Named picture processors only, never CPU lines ("Cortex A7", "Quad-Core").
function setecPictureProcessor(lines) {
  for (const { line } of lines) {
    if (/core|cortex|ghz|gpu|mali/i.test(line)) continue;
    if (!/process|процесор|protsessor/i.test(line)) continue;
    if (/α|alpha|\bxr\b|\bx1\b|\bnq\d|quantum|aipq|neural|hi-view|pixel/i.test(line)) {
      return line;
    }
  }
  return null;
}

function setecToFields(rawLines, tv) {
  const lines = rawLines.map(parseLine);
  // First line is the model name, second the headline.
  const headline = rawLines[1] || "";
  const hdrFormats = mapHdrFormats(lines);
  const mentionsHdr = lines.some(({ line }) => /\bHDR\b/i.test(line));

  const fields = {
    size: tv.size ? null : mapSize([{ key: "size", value: headline, line: headline }]),
    technology: setecTechnology(headline),
    resolution: setecResolution(headline, lines),
    refreshRate: setecRefreshRate(lines),
    os: setecOs(lines),
    hdr: hdrFormats || mentionsHdr ? true : null,
    hdrFormats,
    dolbyVision: featureFlag(lines, /dolby vision/i),
    hdmi: countPorts(lines, "HDMI"),
    usb: countPorts(lines, "USB"),
    vrr: featureFlag(lines, /\bVRR\b|variable refresh/i),
    allm: featureFlag(lines, /\bALLM\b|auto low latency/i),
    freeSync: featureFlag(lines, /freesync/i),
    gSync: featureFlag(lines, /g-?sync/i),
    pictureProcessor: setecPictureProcessor(lines),
    brightness: null,
    audioPower: setecAudioPower(lines),
    audioChannels: mapAudioChannels(lines),
    dolbyAtmos: featureFlag(lines, /dolby\W{0,2}\s*atmos/i), // also "Dolby™ Atmos"
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null)
  );
}

// DDStore's spec tables look auto-generated and sometimes contradict the
// product title (e.g. table "HD Ready", title '43" FHD'). When the title
// names a different resolution, the resolution is left out.
const ddstoreNames = new Map(
  (fs.existsSync(DDSTORE_FILE) ? JSON.parse(fs.readFileSync(DDSTORE_FILE, "utf8")) : [])
    .map((tv) => [tv.url, tv.name])
);

function titleResolution(name) {
  const text = String(name || "").toLowerCase();
  if (/\b8k\b/.test(text)) return "8K";
  if (/\b(4k|uhd)\b/.test(text)) return "4K";
  if (/full\s?hd|\bfhd\b/.test(text)) return "FHD";
  if (/hd\s?ready/.test(text)) return "HD Ready";
  return null;
}

function ddstoreToFields(rawLines, tv) {
  const fields = linesToFields(rawLines, tv);
  const fromTitle = titleResolution(ddstoreNames.get(tv.stores?.DDStore?.url));

  if (fields.resolution && fromTitle && fields.resolution !== fromTitle) {
    console.log(
      `  ⚠️ ${tv.id}: DDStore table says ${fields.resolution}, title says ${fromTitle} — resolution skipped`
    );
    delete fields.resolution;
  }

  return fields;
}

const CONVERTERS = {
  Neptun: linesToFields,
  Anhoch: linesToFields,
  Setec: setecToFields,
  DDStore: ddstoreToFields,
};

// ============================================================
// MAIN
// ============================================================

function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf8"));

  const changes = [];
  const fieldCounts = {};

  const updated = master.map((tv) => {
    if (tv.specsSource || !raw[tv.id]) return tv;

    // Neptun first, then Anhoch, Setec and DDStore fill the gaps.
    const merged = {};
    const usedStores = [];

    for (const store of [...STORE_ORDER].reverse()) {
      const lines = raw[tv.id][store]?.lines;
      if (!lines) continue;

      Object.assign(merged, CONVERTERS[store](lines, tv));
      usedStores.unshift(store);
    }

    if (!usedStores.length || !Object.keys(merged).length) return tv;

    const diff = {};

    for (const [key, value] of Object.entries(merged)) {
      if (JSON.stringify(tv[key]) !== JSON.stringify(value)) {
        diff[key] = { before: tv[key], after: value };
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      }
    }

    changes.push({ tv, stores: usedStores, diff });

    // Only mark the TV as verified when the retailer at least states the
    // panel technology. Otherwise the remaining placeholder values (e.g.
    // "LED") would be trusted as facts by src/lib/tvSpecs.js.
    if (!("technology" in merged)) {
      return { ...tv, ...merged };
    }

    return {
      ...tv,
      ...merged,
      specsSource: usedStores.map((s) => s.toLowerCase()).join("+"),
    };
  });

  console.log(`TVs that would change: ${changes.length} / ${master.length}\n`);
  console.log("Changes per field:");
  for (const [key, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(17)} ${count}`);
  }

  const examples = SHOW
    ? changes.filter((change) => SHOW.includes(change.tv.id))
    : changes.filter((_, index) => index % Math.ceil(changes.length / 6) === 0);

  for (const { tv, stores, diff } of examples) {
    console.log(`\n=== ${tv.brand} ${tv.model}  (${tv.id})  ← ${stores.join(" + ")}`);
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
  const backupFile = path.join(DATA_DIR, `masterTvs.before-retailer-${stamp}.json`);
  fs.copyFileSync(MASTER_FILE, backupFile);
  fs.writeFileSync(MASTER_FILE, JSON.stringify(updated, null, 2));

  console.log(`\nBackup: ${backupFile}`);
  console.log(`Updated: ${MASTER_FILE}`);
}

main();
