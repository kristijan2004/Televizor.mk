
const fs = require("fs");
const path = require("path");
const { firefox } = require("playwright");

const MASTER_FILE = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "masterTvs.json"
);

// ============================================================
// TEST MODE
// ============================================================

const TEST_MODELS = [
  { brand: "LG", model: "55C51LA" },
  { brand: "LG", model: "55QNED70A6A" },
  { brand: "LG", model: "55QNED80A3A" },
  { brand: "TCL", model: "55C6K" },
  { brand: "TCL", model: "55P655" },
];

// IMPORTANT:
// This script does NOT write masterTvs.json yet.

// ============================================================
// HELPERS
// ============================================================

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeModel(value) {
  let text = normalize(value);

  // Remove common LG/TV prefixes that can differ between regions.
  text = text
    .replace(/^oled/, "oled")
    .replace(/^qned/, "qned")
    .replace(/^nano/, "nano");

  return text;
}

function extractScreenSize(model) {
  const text = String(model || "");

  // 55C6K, 55QNED70A6A, OLED55C4, QE55Q80D, etc.
  const match = text.match(
    /^(?:oled|qe|qn|qned|ue|un|kq|kd|xr)?(\d{2,3})(?=[a-z])/i
  );

  return match ? Number(match[1]) : null;
}

function normalizeForComparison(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function modelMatches(targetBrand, targetModel, pageText) {
  const brand = normalizeForComparison(targetBrand);
  const model = normalizeForComparison(targetModel);

  const text = normalizeForComparison(pageText);

  if (!text.includes(brand)) {
    return false;
  }

  // Exact normalized model.
  if (text.includes(model)) {
    return true;
  }

  // DisplaySpecifications often uses an alias.
  // Example:
  // master: 55QNED80A3A
  // DS:     55QNED80A6A
  //
  // Compare the important model family prefix.
  const size = extractScreenSize(targetModel);

  if (!size) {
    return false;
  }

  const targetWithoutSize = model.replace(String(size), "");

  if (
    targetWithoutSize &&
    text.includes(targetWithoutSize) &&
    text.includes(String(size))
  ) {
    return true;
  }

  return false;
}

function getMasterTv(master, target) {
  return master.find(
    (tv) =>
      normalizeForComparison(tv.brand) ===
        normalizeForComparison(target.brand) &&
      normalizeForComparison(tv.model) ===
        normalizeForComparison(target.model)
  );
}

// ============================================================
// PARSING
// ============================================================

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function numberFromText(value) {
  if (!value) return null;

  const match = String(value).match(/[\d.,]+/);

  if (!match) return null;

  const normalized = match[0]
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function parseRefreshRate(value) {
  if (!value) return null;

  const text = cleanText(value);

  const range = text.match(
    /(\d+(?:\.\d+)?)\s*Hz\s*[-–]\s*(\d+(?:\.\d+)?)\s*Hz/i
  );

  if (range) {
    return `${range[1]}-${range[2]} Hz`;
  }

  const single = text.match(/(\d+(?:\.\d+)?)\s*Hz/i);

  return single ? `${single[1]} Hz` : null;
}

function parseBoolean(text, label) {
  const lower = text.toLowerCase();

  if (!lower.includes(label.toLowerCase())) {
    return null;
  }

  return true;
}

function parseSpecs(bodyText) {
  const text = cleanText(bodyText);

  const specs = {};

  // ----------------------------------------------------------
  // SIZE
  // ----------------------------------------------------------

  const sizeMatch = text.match(
    /Display:\s*([\d.]+)\s*in/i
  );

  specs.size = sizeMatch
    ? Number(sizeMatch[1])
    : null;

  // ----------------------------------------------------------
  // TECHNOLOGY / BACKLIGHT
  // ----------------------------------------------------------

  const displayLine = firstMatch(text, [
    /Display:\s*[^,]+,\s*([^,]+),\s*(?:[^,]+),\s*\d+\s*x\s*\d+\s*pixels/i,
  ]);

  specs.technology = null;

  if (displayLine) {
    const lower = displayLine.toLowerCase();

    if (lower.includes("oled")) {
      specs.technology = "OLED";
    } else if (lower.includes("mini led")) {
      specs.technology = "Mini LED";
    } else if (lower.includes("qled")) {
      specs.technology = "QLED";
    } else if (lower.includes("direct led")) {
      specs.technology = "Direct LED";
    } else if (lower.includes("edge led")) {
      specs.technology = "Edge LED";
    } else if (lower.includes("led")) {
      specs.technology = "LED";
    }
  }

  // ----------------------------------------------------------
  // RESOLUTION
  // ----------------------------------------------------------

  const resolutionMatch = text.match(
    /Resolution\s+.*?(\d{3,5}\s*x\s*\d{3,5})\s*pixels/i
  );

  if (resolutionMatch) {
    specs.resolution = resolutionMatch[1];
  } else {
    const displayResolution = text.match(
      /Display:\s*[^,]+(?:,\s*[^,]+){0,3},\s*(\d{3,5}\s*x\s*\d{3,5})\s*pixels/i
    );

    specs.resolution = displayResolution
      ? displayResolution[1]
      : null;
  }

  // ----------------------------------------------------------
  // REFRESH RATE
  // ----------------------------------------------------------

  const refreshText = firstMatch(text, [
    /Refresh rate:\s*([^|]+)/i,
    /Refresh rate\s+([^|]+)/i,
  ]);

  specs.refreshRate = parseRefreshRate(refreshText);

  // ----------------------------------------------------------
  // YEAR
  // ----------------------------------------------------------

  const yearMatch = text.match(
    /Model year\s+.*?(\b20\d{2}\b)/i
  );

  specs.year = yearMatch
    ? Number(yearMatch[1])
    : null;

  // ----------------------------------------------------------
  // PANEL
  // ----------------------------------------------------------

  specs.panelType = firstMatch(text, [
    /Panel type\s+.*?\|\s*([A-Za-z0-9+ -]+)/i,
    /Display:\s*[^,]+,\s*([^,]+),/i,
  ]);

  // ----------------------------------------------------------
  // BRIGHTNESS
  // ----------------------------------------------------------

  const brightnessMatch = text.match(
    /Brightness:\s*([\d.,]+)\s*cd\/m²/i
  );

  specs.brightness = brightnessMatch
    ? numberFromText(brightnessMatch[1])
    : null;

  // ----------------------------------------------------------
  // HDR
  // ----------------------------------------------------------

  specs.hdr = null;

  if (/\bHDR\b/i.test(text)) {
    specs.hdr = true;
  }

  specs.hdrFormats = [];

  const hdrCandidates = [
    "HDR10+",
    "HDR10",
    "Dolby Vision",
    "HLG",
    "HDR",
  ];

  for (const format of hdrCandidates) {
    if (new RegExp(format.replace("+", "\\+"), "i").test(text)) {
      if (!specs.hdrFormats.includes(format)) {
        specs.hdrFormats.push(format);
      }
    }
  }

  if (specs.hdrFormats.length === 0) {
    specs.hdrFormats = null;
  }

  // ----------------------------------------------------------
  // DOLBY VISION
  // ----------------------------------------------------------

  specs.dolbyVision = /Dolby Vision/i.test(text)
    ? true
    : null;

  // ----------------------------------------------------------
  // OS
  // ----------------------------------------------------------

  specs.os = null;

  const osCandidates = [
    "webOS",
    "Google TV",
    "Android TV",
    "Tizen",
    "VIDAA",
    "Roku TV",
    "Fire TV",
  ];

  for (const os of osCandidates) {
    if (new RegExp(os.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
      specs.os = os;
      break;
    }
  }

  // ----------------------------------------------------------
  // HDMI / USB
  // ----------------------------------------------------------

  const hdmiMatch = text.match(
    /HDMI\s+(?:ports?|inputs?)?\s*[:|]?\s*(\d+)/i
  );

  specs.hdmi = hdmiMatch
    ? Number(hdmiMatch[1])
    : null;

  const usbMatch = text.match(
    /USB\s+(?:ports?|inputs?)?\s*[:|]?\s*(\d+)/i
  );

  specs.usb = usbMatch
    ? Number(usbMatch[1])
    : null;

  // ----------------------------------------------------------
  // VRR / ALLM
  // ----------------------------------------------------------

  specs.vrr = /\bVariable Refresh Rate\s*\(VRR\)|\bVRR\b/i.test(text)
    ? true
    : null;

  specs.allm = /\bAuto Low Latency Mode\s*\(ALLM\)|\bALLM\b/i.test(text)
    ? true
    : null;

  // ----------------------------------------------------------
  // FREE SYNC / G-SYNC
  // ----------------------------------------------------------

  specs.freeSync = /FreeSync/i.test(text)
    ? true
    : null;

  specs.gSync = /G-Sync|GSync/i.test(text)
    ? true
    : null;

  // ----------------------------------------------------------
  // AUDIO
  // ----------------------------------------------------------

  const audioPowerMatch = text.match(
    /Audio output power\s+.*?(\d+(?:\.\d+)?)\s*W/i
  );

  specs.audioPower = audioPowerMatch
    ? Number(audioPowerMatch[1])
    : null;

  specs.dolbyAtmos = /Dolby Atmos/i.test(text)
    ? true
    : null;

  // ----------------------------------------------------------
  // PICTURE PROCESSOR
  // ----------------------------------------------------------

  specs.pictureProcessor = firstMatch(text, [
    /Picture processor\s+.*?\|\s*([^|]+)/i,
    /Picture processor\s+([^|]+)/i,
  ]);

  // ----------------------------------------------------------
  // FINAL
  // ----------------------------------------------------------

  return specs;
}

// ============================================================
// SEARCH
// ============================================================

async function searchDisplaySpecifications(page, target) {
  const query = `${target.brand} ${target.model} DisplaySpecifications`;

  console.log(`  🔎 Барам: ${query}`);

  const searchUrl =
    "https://www.google.com/search?q=" +
    encodeURIComponent(`site:displayspecifications.com/en/model "${query}"`);

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(2500);

  const links = await page.locator("a").evaluateAll((anchors) =>
    anchors
      .map((a) => ({
        text: (a.innerText || "").trim(),
        href: a.href || "",
      }))
      .filter((x) =>
        x.href.includes("displayspecifications.com/en/model")
      )
  );

  console.log(`  🔗 DS резултати: ${links.length}`);

  if (links.length === 0) {
    return null;
  }

  // Prefer an actual /en/model/<id> page, not model-display/model-height/etc.
  const modelLinks = links.filter((link) =>
    /^https:\/\/www\.displayspecifications\.com\/en\/model\/[^/]+\/?$/.test(
      link.href
    )
  );

  const candidates =
    modelLinks.length > 0
      ? modelLinks
      : links;

  // Try candidates one by one.
  for (const candidate of candidates.slice(0, 5)) {
    console.log(`  → ${candidate.href}`);

    try {
      await page.goto(candidate.href, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(1500);

      const body = cleanText(await page.locator("body").innerText());

      if (!body || body.length < 500) {
        continue;
      }

      if (
        body.includes("Verify you are human") ||
        body.includes("Just a moment")
      ) {
        console.log("");
        console.log("  ⚠️ DisplaySpecifications бара verification.");
        console.log("  👉 Помини го verification во Firefox.");
        console.log("  ⏳ Чекам 60 секунди...");

        try {
          await page.waitForFunction(
            () => {
              const body = document.body?.innerText || "";
              return (
                body.length > 500 &&
                !body.includes("Verify you are human") &&
                !body.includes("Just a moment")
              );
            },
            { timeout: 60000 }
          );
        } catch {
          console.log("  ❌ Verification не е поминат.");
          continue;
        }
      }

      const finalBody = cleanText(
        await page.locator("body").innerText()
      );

      if (
        modelMatches(
          target.brand,
          target.model,
          finalBody
        )
      ) {
        return {
          url: page.url(),
          body: finalBody,
        };
      }
    } catch (error) {
      console.log(`  ⚠️ Неуспешен кандидат: ${error.message}`);
    }
  }

  return null;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("DisplaySpecifications enrichment test");
  console.log("======================================");
  console.log("");
  console.log("⚠️ TEST MODE — masterTvs.json НЕМА да се менува.");
  console.log("");

  const master = JSON.parse(
    fs.readFileSync(MASTER_FILE, "utf8")
  );

  const browser = await firefox.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1400,
      height: 900,
    },
    locale: "en-US",
  });

  const page = await context.newPage();

  try {
    // Open DS first so verification can appear before search.
    console.log("Отворам DisplaySpecifications...");
    
    await page.goto("https://www.displayspecifications.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    const initialBody = cleanText(
      await page.locator("body").innerText()
    );

    if (
      initialBody.includes("Verify you are human") ||
      initialBody.includes("Just a moment")
    ) {
      console.log("");
      console.log("⚠️ DisplaySpecifications бара verification.");
      console.log("👉 Помини го verification во Firefox.");
      console.log("⏳ Скриптата ќе продолжи автоматски...");
      console.log("");

      try {
        await page.waitForFunction(
          () => {
            const body = document.body?.innerText || "";
            return (
              body.length > 500 &&
              !body.includes("Verify you are human") &&
              !body.includes("Just a moment")
            );
          },
          { timeout: 120000 }
        );
      } catch {
        console.log("❌ Verification не беше завршен.");
      }
    }

    for (let i = 0; i < TEST_MODELS.length; i++) {
      const target = TEST_MODELS[i];

      console.log("");
      console.log(
        `========== ${i + 1}/${TEST_MODELS.length} ==========`
      );

      console.log(`${target.brand} ${target.model}`);

      const masterTv = getMasterTv(master, target);

      if (!masterTv) {
        console.log("❌ Не е најден во masterTvs.json");
        continue;
      }

      console.log(`ID: ${masterTv.id}`);

      const result = await searchDisplaySpecifications(
        page,
        target
      );

      if (!result) {
        console.log("❌ Не најдов точен DS модел.");
        continue;
      }

      console.log(`✅ DS URL: ${result.url}`);

      const specs = parseSpecs(result.body);

      console.log("");
      console.log("Извлечени спецификации:");
      console.log(
        JSON.stringify(specs, null, 2)
      );

      console.log("");
      console.log("DS BODY пример:");
      console.log(
        result.body.slice(0, 1200)
      );
      console.log("");
    }
  } finally {
    console.log("");
    console.log("Тестот заврши.");
    console.log("Browser-от останува отворен.");
    console.log("Не е направена промена во masterTvs.json.");

    // Intentionally keep browser open so you can inspect the result.
    await new Promise(() => {});
  }
}

main().catch((error) => {
  console.error("");
  console.error("❌ Грешка:");
  console.error(error);
  process.exit(1);
});