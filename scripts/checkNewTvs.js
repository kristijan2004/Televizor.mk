// Checks the four retailers (Neptun, Anhoch, Setec, DDStore) for TVs that
// are not in masterTvs.json yet.
//
// IMPORTANT: this script only REPORTS. It does not change any data files.
// Add the new TVs yourself (e.g. to src/Data/master-tvs.json).
//
// For every product in a store's current TV list:
//   1. its store link is already in masterTvs.json      → known, skipped
//   2. its model number is in masterTvs.json, but the
//      TV is not linked to this store yet                → "already in the list"
//   3. otherwise                                        → NEW
//
// The report is printed and saved to reports/new-tvs-YYYY-MM-DD.md
//
// Usage:
//   node scripts/checkNewTvs.js
//   node scripts/checkNewTvs.js --stores Neptun,Anhoch

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const cheerio = require("cheerio");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const MASTER_FILE = path.join(ROOT, "src", "Data", "masterTvs.json");
const REPORT_DIR = path.join(ROOT, "reports");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";

const args = process.argv.slice(2);
const STORES = args.includes("--stores")
  ? args[args.indexOf("--stores") + 1].split(",")
  : ["Neptun", "Anhoch", "Setec", "DDStore"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// STORE LISTINGS
// Each returns [{ store, brand, name, link, price }]
// `link` is in the same format masterTvs.json stores it.
// ============================================================

async function listNeptun() {
  const products = [];

  for (let page = 1; page <= 10; page++) {
    const response = await fetch(
      "https://www.neptun.mk/NeptunCategories/LoadProductsForCategory",
      {
        method: "POST",
        headers: {
          "User-Agent": UA,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json;charset=utf-8",
          Referer: "https://www.neptun.mk/televizori.nspx?items=100",
          "FROM-ANGULAR": "true",
          Origin: "https://www.neptun.mk",
        },
        body: JSON.stringify({
          model: {
            CategoryId: 173,
            Sort: 7,
            Manufacturers: [],
            Recomended: false,
            PriceRange: { MinPriceValue: 0, MaxPriceValue: 10000000 },
            BoolFeatures: [],
            DropdownFeatures: [],
            MultiSelectFeatures: [],
            ShowAllProducts: true,
            ItemsPerPage: 100,
            CurrentPage: page,
            TotalItems: 0,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Neptun HTTP ${response.status}`);

    const items = (await response.json())?.Batch?.Items || [];

    for (const item of items) {
      products.push({
        store: "Neptun",
        brand: item.Manufacturer?.Name || "",
        name: item.Title || "",
        link: item.Url ? `https://www.neptun.mk/${item.Url}` : null,
        price: typeof item.ActualPrice === "number" ? item.ActualPrice : null,
      });
    }

    if (items.length < 100) break;
    await sleep(1000);
  }

  return products;
}

async function listAnhoch() {
  const products = [];

  for (let page = 1; page <= 20; page++) {
    const response = await fetch(
      "https://www.anhoch.com/products?query=&categories[0]=Televisions&tag=&fromPrice=0&toPrice=10000000&inStockOnly=2&sort=latest&perPage=30&page=" +
        page,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://www.anhoch.com/categories/Televisions/products",
        },
      }
    );

    if (!response.ok) throw new Error(`Anhoch HTTP ${response.status}`);

    const data = (await response.json()).products || {};

    for (const item of data.data || []) {
      products.push({
        store: "Anhoch",
        brand: "",
        name: item.name || "",
        link: item.slug || null,
        price: Number(item.price?.amount) || null,
      });
    }

    if (!data.last_page || page >= data.last_page) break;
    await sleep(1000);
  }

  return products;
}

// Setec's search API needs a token. The Setec website sends it itself,
// so the page is opened in a background browser to pick it up.
async function getSetecToken() {
  const browser = await chromium.launch();
  let token = null;

  try {
    const page = await browser.newPage();

    page.on("request", (request) => {
      const auth = request.url().includes("solslab")
        ? request.headers()["authorization"]
        : null;
      if (auth && !token) token = auth.replace(/^Bearer\s+/i, "");
    });

    await page.goto("https://setec.mk/", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } finally {
    await browser.close();
  }

  if (!token) throw new Error("Setec token not found");
  return token;
}

async function listSetec() {
  const token = await getSetecToken();
  const products = [];

  for (let page = 1; page <= 20; page++) {
    const response = await fetch(
      "https://search.sp.solslab.dev/indexes/products/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://www.setec.mk",
          Referer: "https://www.setec.mk/",
        },
        body: JSON.stringify({
          q: "",
          hitsPerPage: 100,
          page,
          filter:
            "product_categories.id = 'pcat_01JFZ1W9MH5JJWEP4XT0YSPGMH' AND status = 'published' AND is_web_active = 'true'",
        }),
      }
    );

    if (!response.ok) throw new Error(`Setec HTTP ${response.status}`);

    const data = await response.json();

    for (const item of data.hits || []) {
      products.push({
        store: "Setec",
        brand: item.brand_name?.trim() || "",
        name: item.title?.trim() || "",
        link: item.handle || null,
        price:
          item.variants?.[0]?.calculated_price?.calculated_amount ?? null,
      });
    }

    if (!data.totalPages || page >= data.totalPages) break;
    await sleep(1000);
  }

  return products;
}

// DDStore's bot protection blocks Node's fetch, but curl works.
async function listDDStore() {
  const products = [];
  const seen = new Set();

  for (let page = 1; page <= 10; page++) {
    const html = execFileSync(
      "curl",
      [
        "-sL",
        "--max-time", "30",
        "-A", UA,
        `https://ddstore.mk/mk/monitorstvandprojectors/televisionsandequipment/televisions.html?p=${page}`,
      ],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );

    const $ = cheerio.load(html);
    let added = 0;

    $("a.product-item-link").each((_, element) => {
      const name = $(element).text().replace(/\s+/g, " ").trim();
      let link = ($(element).attr("href") || "").split("?")[0];
      if (link.startsWith("/")) link = "https://ddstore.mk" + link;
      if (!name || !link || seen.has(link)) return;

      seen.add(link);
      added++;

      const priceText = $(element).closest("li").find(".price").first().text();
      const price = Number(priceText.replace(/[^\d]/g, "")) || null;

      products.push({ store: "DDStore", brand: "", name, link, price });
    });

    // Magento repeats the last page when asked for a page past the end.
    if (added === 0) break;
    await sleep(2000);
  }

  return products;
}

// Store TV categories also contain accessories and projectors, e.g. Neptun
// lists Samsung Frame bezels ("Рамка за телевизор") and interactive boards
// ("SMART Табла"), Setec lists Samsung projectors (SP-LFF3CLAXXH).
const NOT_A_TV = /рамка|ramka|табла|tabla|држач|носач|nosac|далечински|кабел|bracket|wall mount|projector|проектор|(^|\s)SP-?L[A-Z0-9]/i;

const LISTERS = {
  Neptun: listNeptun,
  Anhoch: listAnhoch,
  Setec: listSetec,
  DDStore: listDDStore,
};

// ============================================================
// MATCHING
// ============================================================

// Cyrillic letters that look Latin (e.g. "QE50Q8FAAUXХH" with a Cyrillic "Х").
const LOOKALIKES = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y" };

function toLatin(text) {
  return String(text || "").replace(/[АВЕКМНОРСТХУ]/g, (c) => LOOKALIKES[c]);
}

function storeLinkOf(tv, store) {
  const data = tv.stores?.[store];
  if (!data) return null;
  if (store === "Setec") return data.handle || null;
  return (data.url || "").split("?")[0] || null;
}

// "65 QNED72 B3B" → a pattern that also finds "LG 65QNED72B3B" or
// "65-QNED72-B3B" (and "K55A65PB.CEI" with a dot), but not "65QNED72B3BX".
function modelPattern(model) {
  const core = toLatin(model)
    .replace(/\/\d+$/, "") // Philips "/12"
    .replace(/[^A-Za-z0-9]/g, "");

  // Too short or no digits ("Imago") — not a reliable model number.
  if (core.length < 5 || !/\d/.test(core)) return null;

  const body = core
    .split("")
    .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\-.]*");

  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, "i");
}

function buildMatcher(master) {
  const linked = {};
  for (const store of Object.keys(LISTERS)) {
    linked[store] = new Set(master.map((tv) => storeLinkOf(tv, store)).filter(Boolean));
  }

  const patterns = master
    .map((tv) => ({ tv, pattern: modelPattern(tv.model) }))
    .filter((entry) => entry.pattern);

  return (product) => {
    if (product.link && linked[product.store].has(product.link)) {
      return { status: "known" };
    }

    const text = toLatin(product.name);
    const match = patterns.find(({ pattern }) => pattern.test(text));

    if (match) return { status: "inList", tv: match.tv };
    return { status: "new" };
  };
}

// ============================================================
// REPORT
// ============================================================

function storeUrl(product) {
  if (product.store === "Anhoch") return `https://www.anhoch.com/products/${product.link}`;
  if (product.store === "Setec") return `https://setec.mk/products/${product.link}`;
  return product.link;
}

function formatPrice(price) {
  return price ? `${Number(price).toLocaleString("de-DE")} ден.` : "—";
}

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
  const match = buildMatcher(master);
  const date = new Date().toISOString().slice(0, 10);

  const lines = [`# Нови телевизори — ${date}`, ""];
  const summary = [];

  for (const store of STORES) {
    console.log(`\n${store}: reading the TV list...`);

    let products;
    try {
      products = await LISTERS[store]();
    } catch (error) {
      console.log(`  ❌ ${store} failed: ${error.message}`);
      lines.push(`## ${store}`, "", `❌ Не успеа: ${error.message}`, "");
      summary.push(`${store}: failed`);
      continue;
    }

    const accessories = products.filter((product) => NOT_A_TV.test(product.name));
    const tvs = products.filter((product) => !NOT_A_TV.test(product.name));

    const results = tvs.map((product) => ({ product, ...match(product) }));
    const fresh = results.filter((r) => r.status === "new");
    const inList = results.filter((r) => r.status === "inList");

    console.log(
      `  ${tvs.length} TVs · ${fresh.length} new · ${inList.length} already in the list (not linked to ${store}) · ${accessories.length} accessories skipped`
    );
    summary.push(`${store}: ${tvs.length} TVs, ${fresh.length} new, ${inList.length} already in the list`);

    lines.push(
      `## ${store}`,
      "",
      `Телевизори: ${tvs.length} · прескокнати додатоци: ${accessories.length}`,
      ""
    );

    lines.push(`### Нови (${fresh.length})`, "");
    if (!fresh.length) lines.push("Нема нови телевизори.", "");
    for (const { product } of fresh) {
      console.log(`  🆕 ${product.name}  ·  ${formatPrice(product.price)}`);
      lines.push(`- **${product.name}** · ${formatPrice(product.price)}  `, `  ${storeUrl(product)}`);
    }
    if (fresh.length) lines.push("");

    if (inList.length) {
      lines.push(`### Веќе во листата, но не се поврзани со ${store} (${inList.length})`, "");
      for (const { product, tv } of inList) {
        console.log(`  🔗 ${product.name}  →  ${tv.brand} ${tv.model}`);
        lines.push(`- ${product.name} → \`${tv.id}\`  `, `  ${storeUrl(product)}`);
      }
      lines.push("");
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, `new-tvs-${date}.md`);
  fs.writeFileSync(reportFile, lines.join("\n"));

  console.log("\n" + summary.join("\n"));
  console.log(`\nReport: ${reportFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
