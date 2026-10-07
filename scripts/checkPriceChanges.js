// Compares the prices currently in masterTvs.json against the last snapshot and
// reports what changed, per TV and per store.
//
// IMPORTANT: this script never modifies masterTvs.json. With --write it only
// appends to the history log and refreshes the snapshot.
//
// Why a diff instead of a new scraper: buildMasterTvs.js has already matched
// every retailer listing to a TV, so the answer is sitting in masterTvs.json
// under `stores`. Run the scrapers, rebuild, then run this.
//
// Only CHANGES are logged, never a row per listing per run. 622 listings logged
// daily would be ~227k rows a year; actual changes are a few dozen a day.
//
// Usage:
//   node scripts/checkPriceChanges.js                  # preview, writes nothing
//   node scripts/checkPriceChanges.js --write          # append history + update snapshot
//   node scripts/checkPriceChanges.js --master <file>  # compare another file (testing, backups)
//   node scripts/checkPriceChanges.js --snapshot <file>
//   node scripts/checkPriceChanges.js --all            # list every change, not just the first 25

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src", "Data");
const REPORT_DIR = path.join(ROOT, "reports");

const args = process.argv.slice(2);
const flag = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;

const WRITE = args.includes("--write");
const ALL = args.includes("--all");
const MASTER_FILE = path.resolve(ROOT, flag("--master", path.join(DATA_DIR, "masterTvs.json")));
const SNAPSHOT_FILE = path.resolve(ROOT, flag("--snapshot", path.join(DATA_DIR, "priceSnapshot.json")));
const HISTORY_FILE = path.join(DATA_DIR, "priceHistory.jsonl");

const STORE_ORDER = ["Neptun", "Anhoch", "Setec", "DDStore"];

// ============================================================
// HELPERS
// ============================================================

const formatPrice = (price) =>
  price || price === 0 ? `${Number(price).toLocaleString("de-DE")} ден.` : "—";

function percent(from, to) {
  if (!from || !to) return null;
  return ((to - from) / from) * 100;
}

// "xiaomi-ela5950gl|DDStore" — one listing of one TV at one store.
const keyOf = (id, store) => `${id}|${store}`;

function readListings(file) {
  const tvs = JSON.parse(fs.readFileSync(file, "utf8"));
  const listings = new Map();

  for (const tv of tvs) {
    for (const [store, data] of Object.entries(tv.stores || {})) {
      if (!data || typeof data !== "object") continue;

      listings.set(keyOf(tv.id, store), {
        id: tv.id,
        store,
        brand: tv.brand,
        model: tv.model,
        size: tv.size,
        price: typeof data.price === "number" ? data.price : null,
        regularPrice: typeof data.regularPrice === "number" ? data.regularPrice : null,
        inStock: data.inStock === true,
      });
    }
  }

  return listings;
}

// ============================================================
// COMPARE
// ============================================================

function compare(current, snapshot) {
  const priceChanges = [];
  const stockChanges = [];
  const added = [];
  const removed = [];

  for (const [key, now] of current) {
    const before = snapshot[key];

    if (!before) {
      added.push(now);
      continue;
    }

    if (before.price !== now.price) {
      priceChanges.push({ ...now, from: before.price, to: now.price });
    }

    // Reported apart from prices: stock flips far more often and would
    // otherwise drown the price signal in the report.
    if (before.inStock !== now.inStock) {
      stockChanges.push({ ...now, fromStock: before.inStock, toStock: now.inStock });
    }
  }

  for (const [key, before] of Object.entries(snapshot)) {
    if (!current.has(key)) removed.push(before);
  }

  const bySize = (a, b) => Math.abs(percent(b.from, b.to) || 0) - Math.abs(percent(a.from, a.to) || 0);

  return {
    priceChanges: priceChanges.sort(bySize),
    stockChanges,
    added,
    removed,
  };
}

// ============================================================
// OUTPUT
// ============================================================

function describe(change) {
  const pct = percent(change.from, change.to);
  const arrow = change.to < change.from ? "↓" : "↑";
  const pctText = pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  return `${arrow} ${change.brand} ${change.model} ${change.size}" [${change.store}]  ` +
    `${formatPrice(change.from)} → ${formatPrice(change.to)}${pctText}`;
}

function buildReport(result, date, isBaseline) {
  const lines = [`# Промени во цените — ${date}`, ""];

  if (isBaseline) {
    lines.push(
      "Прво мерење: нема со што да се спореди.",
      "",
      `Зачувани се ${result.added.length} понуди како почетна состојба.`,
      ""
    );
    return lines;
  }

  const drops = result.priceChanges.filter((c) => c.to < c.from);
  const rises = result.priceChanges.filter((c) => c.to > c.from);

  lines.push(
    `Поевтинети: **${drops.length}** · поскапени: **${rises.length}** · ` +
      `промена на достапност: **${result.stockChanges.length}** · ` +
      `нови понуди: **${result.added.length}** · исчезнати: **${result.removed.length}**`,
    ""
  );

  const section = (title, items, render) => {
    lines.push(`## ${title} (${items.length})`, "");
    if (!items.length) {
      lines.push("Нема.", "");
      return;
    }
    for (const item of items) lines.push(`- ${render(item)}`);
    lines.push("");
  };

  section("Поевтинети", drops, (c) => `**${c.brand} ${c.model}** ${c.size}" · ${c.store} · ${formatPrice(c.from)} → **${formatPrice(c.to)}** (${percent(c.from, c.to).toFixed(1)}%)`);
  section("Поскапени", rises, (c) => `**${c.brand} ${c.model}** ${c.size}" · ${c.store} · ${formatPrice(c.from)} → **${formatPrice(c.to)}** (+${percent(c.from, c.to).toFixed(1)}%)`);
  section("Промена на достапност", result.stockChanges, (c) => `${c.brand} ${c.model} ${c.size}" · ${c.store} · ${c.fromStock ? "достапен → недостапен" : "недостапен → достапен"}`);
  section("Нови понуди", result.added, (c) => `${c.brand} ${c.model} ${c.size}" · ${c.store} · ${formatPrice(c.price)}`);
  section("Исчезнати понуди", result.removed, (c) => `${c.brand} ${c.model} ${c.size}" · ${c.store}`);

  return lines;
}

// ============================================================
// MAIN
// ============================================================

function main() {
  if (!fs.existsSync(MASTER_FILE)) {
    console.error(`Нема датотека: ${MASTER_FILE}`);
    process.exit(1);
  }

  const current = readListings(MASTER_FILE);

  const isBaseline = !fs.existsSync(SNAPSHOT_FILE);
  const snapshot = isBaseline
    ? {}
    : JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8")).listings || {};

  console.log(`Споредба: ${path.relative(ROOT, MASTER_FILE)}`);
  console.log(`Снимка:   ${path.relative(ROOT, SNAPSHOT_FILE)}${isBaseline ? "  (не постои — прво мерење)" : ""}`);
  console.log(`Понуди сега: ${current.size}   во снимката: ${Object.keys(snapshot).length}\n`);

  const result = isBaseline
    ? { priceChanges: [], stockChanges: [], added: [...current.values()], removed: [] }
    : compare(current, snapshot);

  if (isBaseline) {
    console.log(`Прво мерење — нема со што да се спореди. ${current.size} понуди ќе се зачуваат како почетна состојба.`);
  } else {
    const drops = result.priceChanges.filter((c) => c.to < c.from);
    const rises = result.priceChanges.filter((c) => c.to > c.from);

    console.log(`Поевтинети: ${drops.length}`);
    console.log(`Поскапени:  ${rises.length}`);
    console.log(`Достапност: ${result.stockChanges.length}`);
    console.log(`Нови:       ${result.added.length}`);
    console.log(`Исчезнати:  ${result.removed.length}\n`);

    const shown = ALL ? result.priceChanges : result.priceChanges.slice(0, 25);
    for (const change of shown) console.log("  " + describe(change));
    if (result.priceChanges.length > shown.length) {
      console.log(`  … и уште ${result.priceChanges.length - shown.length} (--all за сите)`);
    }

    for (const change of result.stockChanges.slice(0, ALL ? Infinity : 10)) {
      console.log(`  ${change.fromStock ? "⊘" : "✓"} ${change.brand} ${change.model} [${change.store}] ` +
        `${change.fromStock ? "достапен → недостапен" : "недостапен → достапен"}`);
    }
  }

  const date = new Date().toISOString().slice(0, 10);

  if (!WRITE) {
    console.log("\nСамо преглед. Ништо не е запишано. Со --write се зачувува историјата.");
    return;
  }

  // 1. append only real changes to the history log
  const at = new Date().toISOString();
  const rows = [
    ...result.priceChanges.map((c) => ({
      at, type: "price", id: c.id, store: c.store, brand: c.brand, model: c.model,
      from: c.from, to: c.to, pct: Number((percent(c.from, c.to) || 0).toFixed(2)),
    })),
    ...result.stockChanges.map((c) => ({
      at, type: "stock", id: c.id, store: c.store, brand: c.brand, model: c.model,
      from: c.fromStock, to: c.toStock,
    })),
    ...result.added.map((c) => ({
      at, type: "added", id: c.id, store: c.store, brand: c.brand, model: c.model, to: c.price,
    })),
    ...result.removed.map((c) => ({
      at, type: "removed", id: c.id, store: c.store, brand: c.brand, model: c.model, from: c.price,
    })),
  ];

  if (rows.length) {
    fs.appendFileSync(HISTORY_FILE, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }

  // 2. refresh the snapshot
  const listings = {};
  for (const [key, value] of current) listings[key] = value;

  fs.writeFileSync(
    SNAPSHOT_FILE,
    JSON.stringify({ takenAt: at, source: path.relative(ROOT, MASTER_FILE), listings }, null, 2)
  );

  // 3. write the markdown report
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, `price-changes-${date}.md`);
  fs.writeFileSync(reportFile, buildReport(result, date, isBaseline).join("\n"));

  console.log(`\nЗапишано:`);
  console.log(`  ${rows.length} реда во ${path.relative(ROOT, HISTORY_FILE)}`);
  console.log(`  снимка: ${path.relative(ROOT, SNAPSHOT_FILE)}`);
  console.log(`  извештај: ${path.relative(ROOT, reportFile)}`);
}

main();
