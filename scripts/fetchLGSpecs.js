// Fetches specifications for our LG TVs from three Balkan retailer sites.
//
// LG's own site does not work for this: our Macedonian retail codes
// (NU800, NU850, MRGB, UA750, the "B3"/"A6"/"A3" generation letters) belong
// to a regional LG line that has no public storefront on lg.com in any
// market we could find (UK/DE/PL use a different generation-naming scheme
// entirely, and LG no longer runs a shop in Russia/CIS where this scheme
// originates).
//
// Three sources cover the same regional lineup, each with different
// strengths, all with robots.txt that allows ClaudeBot:
//   - technopolis.bg (Bulgaria): 37/72 models, full "classification
//     features" table embedded as escaped JSON. Some fields list more than
//     one value under the same name (e.g. SOUND TECHNOLOGY -> both
//     "Dolby Atmos" and "Clear Voice Pro") - every name maps to an array.
//   - technomarket.bg (Bulgaria): +10 more models, but a much thinner plain
//     HTML spec table - no processor/HDMI/USB/HDR, just OS/technology/
//     resolution/size confirmation.
//   - ekupi.mk (North Macedonia - our own market): only 6 models, but the
//     richest data of all three: a plain-text bullet list with explicit
//     "Процесор:", "Порти:3xHDMI(...),1xUSB", "HDR10/HLG", "ALLM (...)",
//     "VRR (...)", "Озвучување:20W" (audio power).
//
// All three are normalised into the SAME canonical feature-name schema
// technopolis already used (VIDEO PROCESSOR, INPUT formatted as
// "HDMI x N, USB x M", OPERATING SYSTEM, SCREEN TECHNOLOGY, RESOLUTION,
// HDR, OTHER FUNCTIONS, AUDIO POWER, DISPLAY SIZE SM...) so applyLGSpecs.js
// does not need to know which site a value came from.
//
// IMPORTANT: this script only DOWNLOADS. It never changes masterTvs.json.
//
// Usage:
//   node scripts/fetchLGSpecs.js
//   node scripts/fetchLGSpecs.js --limit 5
//   node scripts/fetchLGSpecs.js --refetch

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const CACHE_FILE = path.join(DATA_DIR, "lgSpecs.json");

const DELAY_MS = 5000; // robots.txt: Crawl-delay: 5 (technopolis.bg) / 3 (zora, not used here)

const args = process.argv.slice(2);
const REFETCH = args.includes("--refetch");
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const stripOled = (code) => code.replace(/^OLED/, "");

function loadJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function addFeature(features, name, value) {
  if (!value) return;
  const clean = String(value).trim();
  if (!clean) return;
  if (!features[name]) features[name] = [];
  if (!features[name].includes(clean)) features[name].push(clean);
}

// ============================================================
// SOURCE 1: technopolis.bg
// ============================================================

async function buildTechnopolisMap() {
  const map = new Map();
  const sitemaps = [
    "https://www.technopolis.bg/sitemapurl/Product-en-EUR-0.xml",
    "https://www.technopolis.bg/sitemapurl/Product-en-EUR-1.xml",
  ];

  for (const url of sitemaps) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`technopolis sitemap HTTP ${res.status}`);
    const xml = await res.text();

    for (const m of xml.matchAll(
      /<loc>(https:\/\/www\.technopolis\.bg\/en\/Televizori\/Televizor-LG-([A-Za-z0-9]+)[^<]*)<\/loc>/g
    )) {
      const code = stripOled(norm(m[2]));
      if (!map.has(code)) map.set(code, m[1]);
    }
  }

  return map;
}

function parseTechnopolis(html) {
  const features = {};
  const pattern = /\{[^{}]*"featureValues":\[\{"value":"((?:[^"\\]|\\.)*)"\}\][^{}]*"name":"([A-Z0-9_ ]+)"[^{}]*\}/g;
  const seen = new Set();

  for (const m of html.matchAll(pattern)) {
    const key = m[2] + "\u0000" + m[1];
    if (seen.has(key)) continue;
    seen.add(key);

    const value = m[1].replace(/\\"/g, '"').replace(/\\u002[Ff]/g, "/").trim();
    addFeature(features, m[2], value);
  }

  return features;
}

// ============================================================
// SOURCE 2: technomarket.bg
// ============================================================

async function buildTechnomarketMap() {
  const map = new Map();
  const sitemaps = [0, 1, 2, 3].map((i) => `https://www.technomarket.bg/sitemap/${i}.xml`);

  for (const url of sitemaps) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`technomarket sitemap HTTP ${res.status}`);
    const xml = await res.text();

    for (const m of xml.matchAll(/<loc>(https:\/\/www\.technomarket\.bg\/televizor\/lg-([a-z0-9]+)[^<]*)<\/loc>/gi)) {
      const code = stripOled(norm(m[2]));
      if (!map.has(code)) map.set(code, m[1]);
    }
  }

  return map;
}

const TECHNOMARKET_LABELS = {
  "операционна система": "OPERATING SYSTEM",
  "технология": "SCREEN TECHNOLOGY",
  "резолюция": "RESOLUTION",
  "диагонал на екрана (см)": "DISPLAY SIZE SM",
};

function parseTechnomarket(html) {
  const features = {};
  const idx = html.indexOf('id="specifications"');
  if (idx === -1) return features;

  const block = html.slice(idx, idx + 4000);
  const pattern = /<td class="label">([^<]*)<\/td><td>(?:<a[^>]*>([^<]*)<\/a>|<span class="pre">([^<]*?)(?:<br\s*\/?>)?<\/span>)<\/td>/g;

  for (const m of block.matchAll(pattern)) {
    const label = m[1].trim().toLowerCase();
    const value = (m[2] || m[3] || "").trim();
    const canonical = TECHNOMARKET_LABELS[label];
    if (canonical) addFeature(features, canonical, value);
  }

  return features;
}

// ============================================================
// SOURCE 3: ekupi.mk
// ============================================================

// ekupi's URL slugs mix the model code into a longer marketing phrase with
// no reliable boundary ("lg-led-tv-43ua75003la-4k-ultra-hd-smart-tv-..."),
// and its own TV catalog is small (a handful of pages) - so instead of
// trying to extract a clean code from the slug, check whether each of OUR
// model codes appears as a substring of the (de-dashed) slug.
async function buildEkupiMap(ourModelCodes) {
  const map = new Map();
  const res = await fetch("https://www.ekupi.mk/product-sitemap.xml");
  if (!res.ok) throw new Error(`ekupi sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const tvPages = locs.filter((u) => {
    const dec = decodeURIComponent(u);
    return /\/lg-/i.test(dec) && /телевизори/i.test(dec);
  });

  for (const u of tvPages) {
    const slugCode = stripOled(norm(decodeURIComponent(u)));

    for (const code of ourModelCodes) {
      if (slugCode.includes(code) && !map.has(code)) map.set(code, u);
    }
  }

  return map;
}

function parseEkupi(html) {
  const features = {};

  // The spec bullets live in a <ul> that mentions ports/processor - pick
  // that one out of every <ul> on the page (nav menus etc. also use <ul>).
  const ulBlocks = [...html.matchAll(/<ul>([\s\S]*?)<\/ul>/g)].map((m) => m[1]);
  const specBlock = ulBlocks.find((b) => /Процесор:|Порти:|Резолуција:/.test(b));
  if (!specBlock) return features;

  const items = [...specBlock.matchAll(/<li>([^<]+)<\/li>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim()
  );

  for (const item of items) {
    const colon = item.indexOf(":");
    const label = colon === -1 ? "" : item.slice(0, colon).trim().toLowerCase();
    const value = colon === -1 ? item : item.slice(colon + 1).trim();

    if (label === "процесор") addFeature(features, "VIDEO PROCESSOR", value);
    else if (label === "резолуција") addFeature(features, "RESOLUTION", value);
    else if (label === "оперативен систем") addFeature(features, "OPERATING SYSTEM", value);
    else if (label === "озвучување") addFeature(features, "AUDIO POWER", value);
    else if (label === "порти") {
      const hdmi = value.match(/(\d+)\s*x\s*HDMI/i);
      const usb = value.match(/(\d+)\s*x\s*USB/i);
      if (hdmi || usb) {
        addFeature(
          features,
          "INPUT",
          `HDMI x ${hdmi ? hdmi[1] : 0}, USB x ${usb ? usb[1] : 0}`
        );
      }
    } else if (/^\d+"\(\d+cm\)/.test(item)) {
      const cm = item.match(/\((\d+)\s*cm\)/i);
      if (cm) addFeature(features, "DISPLAY SIZE SM", `${cm[1]} cm`);
    } else if (/HDR10|HLG|Dolby Vision/i.test(item)) {
      addFeature(features, "HDR", item);
    } else if (/Dolby Atmos/i.test(item)) {
      addFeature(features, "SOUND TECHNOLOGY", item);
    } else if (/\bALLM\b|\bVRR\b/i.test(item)) {
      addFeature(features, "OTHER FUNCTIONS", item);
    }
  }

  return features;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const lg = master.filter((tv) => tv.brand === "LG");

  console.log(`LG TVs in master: ${lg.length}`);
  console.log("Reading retailer sitemaps...");

  const ourModelCodes = lg.map((tv) => norm(tv.model));

  const [technopolisMap, technomarketMap, ekupiMap] = await Promise.all([
    buildTechnopolisMap(),
    buildTechnomarketMap(),
    buildEkupiMap(ourModelCodes),
  ]);

  console.log(`  technopolis.bg:  ${technopolisMap.size} LG TV pages`);
  console.log(`  technomarket.bg: ${technomarketMap.size} LG TV pages`);
  console.log(`  ekupi.mk:        ${ekupiMap.size} LG TV pages`);

  const SOURCES = [
    ["technopolis", technopolisMap, parseTechnopolis],
    ["technomarket", technomarketMap, parseTechnomarket],
    ["ekupi", ekupiMap, parseEkupi],
  ];

  const cache = loadJson(CACHE_FILE, {});
  let fetched = 0;

  for (const tv of lg) {
    if (fetched >= LIMIT) break;
    if (!REFETCH && cache[tv.id]) continue;

    const code = norm(tv.model);
    const matches = SOURCES.filter(([, map]) => map.has(code));

    if (!matches.length) {
      cache[tv.id] = { found: false, checkedAt: new Date().toISOString().slice(0, 10) };
      continue;
    }

    const features = {};
    const sources = {};

    for (const [name, map, parser] of matches) {
      const url = map.get(code);
      console.log(`  ${tv.id} -> [${name}] ${url}`);

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const parsed = parser(html);

        for (const [key, values] of Object.entries(parsed)) {
          for (const v of values) addFeature(features, key, v);
        }

        sources[name] = url;
      } catch (error) {
        console.log(`    failed: ${error.message}`);
      }

      await sleep(DELAY_MS);
    }

    cache[tv.id] = {
      found: Object.keys(sources).length > 0,
      sources,
      features,
      checkedAt: new Date().toISOString().slice(0, 10),
    };

    fetched++;
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");

  const foundCount = Object.values(cache).filter((v) => v.found).length;
  console.log(`\nCached: ${Object.keys(cache).length} (found: ${foundCount})`);
  console.log(`Saved to: ${CACHE_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
