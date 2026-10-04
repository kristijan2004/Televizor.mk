// Fetches the specification section from retailer product pages (Neptun,
// Anhoch, Setec, DDStore) for TVs that do not have verified specs yet (no `specsSource`).
//
// IMPORTANT: this script does NOT modify masterTvs.json.
// Raw spec lines are saved to src/Data/retailerSpecsRaw.json, keyed by TV id
// and then by store. Already fetched pages are skipped on the next run.
//
// Usage:
//   node scripts/fetchRetailerSpecs.js
//   node scripts/fetchRetailerSpecs.js --limit 5
//   node scripts/fetchRetailerSpecs.js --stores Neptun
//   node scripts/fetchRetailerSpecs.js --stores Setec

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const cheerio = require("cheerio");
const { chromium } = require("playwright");

const DATA_DIR = path.join(__dirname, "..", "src", "Data");
const MASTER_FILE = path.join(DATA_DIR, "masterTvs.json");
const OUTPUT_FILE = path.join(DATA_DIR, "retailerSpecsRaw.json");

const DELAY_MS = 1500;

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;
const STORES = args.includes("--stores")
  ? args[args.indexOf("--stores") + 1].split(",")
  : ["Neptun", "Anhoch"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// STORE PAGES
// ============================================================

// Saved Neptun links (https://www.neptun.mk/84123491-BEKO-50-BIQ-8000) are
// outdated; product pages now live under /categories/televizori/.
function neptunUrl(store) {
  const slug = String(store.url || "").split("/").pop();
  return slug ? `https://www.neptun.mk/categories/televizori/${slug}` : null;
}

function anhochUrl(store) {
  return store.url ? `https://www.anhoch.com/products/${store.url}` : null;
}

function ddstoreUrl(store) {
  return store.url || null;
}

function setecUrl(store) {
  return store.handle ? `https://setec.mk/products/${store.handle}` : null;
}

// Neptun: "Key: Value" lines between the spec heading and the disclaimer.
async function extractNeptun(page) {
  const text = await page.locator("body").innerText();
  const start = text.indexOf("ТЕХНИЧКА СПЕЦИФИКАЦИЈА");
  if (start === -1) return null;

  const end = text.indexOf("Можни се печатни грешки", start);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "Главни карактеристики")
    .slice(1);
}

// Anhoch: table rows in the description tab, as "Key: Value".
async function extractAnhoch(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#description");
    if (!root) return null;

    const rows = [...root.querySelectorAll("tr")]
      .map((tr) =>
        [...tr.querySelectorAll("th, td")]
          .map((cell) => cell.innerText.replace(/\s+/g, " ").trim())
          .filter(Boolean)
      )
      .filter((cells) => cells.length)
      .map((cells) => cells.join(": "));

    if (rows.length) return rows;

    // Some products have a plain text description instead of a table.
    return root.innerText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  });
}

// Setec: mostly free-text lines between the spec heading and the
// "similar products" section. The page is rendered in the browser.
async function extractSetec(page) {
  const text = await page.locator("body").innerText();
  const start = text.indexOf("Технички спецификации");
  if (start === -1) return null;

  const end = text.indexOf("Слични производи", start);
  const section = text.slice(start, end === -1 ? undefined : end);

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1);
}

// DDStore: the attribute table, as "Key: Value". "N/A" rows are skipped.
//
// DDStore's bot protection blocks Node's fetch, and in the browser its pages
// never become idle, but a plain curl download works and the table is in the
// HTML. So DDStore is downloaded with curl instead of the browser.
function fetchDDStore(url) {
  const html = execFileSync(
    "curl",
    [
      "-sL",
      "--max-time", "30",
      "-A", "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
      "-w", "\n%{http_code}",
      url,
    ],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );

  const status = Number(html.slice(html.lastIndexOf("\n") + 1));
  const $ = cheerio.load(html);

  const lines = $("#product-attribute-specs-table tr")
    .map((_, tr) => {
      const key = $(tr).find("th").text().trim();
      const value = $(tr).find("td").text().replace(/\s+/g, " ").trim();
      return key && value && value !== "N/A" ? `${key}: ${value}` : null;
    })
    .get()
    .filter(Boolean);

  return { status, lines };
}

const STORE_CONFIG = {
  Neptun: { url: neptunUrl, extract: extractNeptun },
  Anhoch: { url: anhochUrl, extract: extractAnhoch },
  Setec: { url: setecUrl, extract: extractSetec },
  DDStore: { url: ddstoreUrl, fetch: fetchDDStore },
};

// ============================================================
// MAIN
// ============================================================

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const results = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"))
    : {};

  const jobs = [];

  for (const tv of master) {
    if (tv.specsSource) continue;

    for (const storeName of STORES) {
      const store = tv.stores?.[storeName];
      // Skip pages already fetched with specs; failed pages are retried.
      if (!store || results[tv.id]?.[storeName]?.lines) continue;

      const url = STORE_CONFIG[storeName].url(store);
      if (url) jobs.push({ tv, storeName, url });
    }
  }

  const todo = jobs.slice(0, LIMIT);
  console.log(`Retailer pages to fetch: ${todo.length}\n`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let found = 0;

  try {
    for (const [index, { tv, storeName, url }] of todo.entries()) {
      const label = `[${index + 1}/${todo.length}] ${storeName} · ${tv.brand} ${tv.model}`;
      let lines = null;
      let status = null;

      try {
        if (STORE_CONFIG[storeName].fetch) {
          ({ status, lines } = STORE_CONFIG[storeName].fetch(url));
        } else {
          const response = await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          status = response ? response.status() : null;

          if (status === 200) {
            lines = await STORE_CONFIG[storeName].extract(page);
          }
        }
      } catch (error) {
        status = "error: " + error.message.split("\n")[0];
      }

      results[tv.id] = results[tv.id] || {};
      results[tv.id][storeName] = {
        url,
        status,
        fetchedAt: new Date().toISOString().slice(0, 10),
        lines: lines && lines.length ? lines : null,
      };

      if (lines && lines.length) {
        found++;
        console.log(`✅ ${label} (${lines.length} lines)`);
      } else {
        console.log(`❌ ${label} (status ${status})`);
      }

      if (index % 10 === 0 || index === todo.length - 1) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      }

      await sleep(DELAY_MS);
    }
  } finally {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    await browser.close();
  }

  console.log(`\nPages with specs: ${found} / ${todo.length}`);
  console.log(`Saved to ${OUTPUT_FILE}`);
}

main();
