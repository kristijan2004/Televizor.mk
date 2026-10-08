// Ги вчитува телевизорите од src/Data/masterTvs.json во SQLite.
//
// Може да се пушти повторно колку сакаш: базата се полни одново секој пат,
// па masterTvs.json останува изворот на вистината. Ништо не се менува во JSON.
//
//   node import.js
//   node import.js --db /пат/до/display.db

const fs = require("fs");
const path = require("path");
const { openDb, DB_FILE } = require("./db");

const MASTER = path.join(__dirname, "..", "src", "Data", "masterTvs.json");

// Полиња што се чуваат како JSON текст (листи/објекти).
const JSON_FIELDS = ["hdrFormats", "stores"];

// Полиња што во JSON се true/false, а во SQLite се 1/0.
const BOOL_FIELDS = [
  "hdr", "dolbyVision", "vrr", "allm",
  "dolbyAtmos", "freeSync", "gSync",
];

const COLUMNS = [
  "id", "brand", "model", "size", "technology", "resolution", "refreshRate",
  "year", "os", "hdr", "dolbyVision", "hdmi", "usb", "vrr", "allm",
  "pictureProcessor", "hdrFormats", "brightness", "audioPower",
  "audioChannels", "dolbyAtmos", "freeSync", "gSync", "image", "stores",
  "specsSource",
];

function toCell(field, value) {
  if (JSON_FIELDS.includes(field)) {
    return JSON.stringify(value ?? (field === "stores" ? {} : []));
  }

  if (BOOL_FIELDS.includes(field)) {
    return value === true ? 1 : 0;
  }

  if (value === undefined || value === null) return null;

  // node:sqlite прима само null/number/string/bigint/Buffer.
  if (typeof value === "object") return JSON.stringify(value);

  return value;
}

function main() {
  if (!fs.existsSync(MASTER)) {
    console.error(`Нема ${MASTER}`);
    process.exit(1);
  }

  const tvs = JSON.parse(fs.readFileSync(MASTER, "utf8"));
  const db = openDb();

  db.exec("DELETE FROM tvs");

  const insert = db.prepare(
    `INSERT INTO tvs (${COLUMNS.join(", ")})
     VALUES (${COLUMNS.map(() => "?").join(", ")})`
  );

  db.exec("BEGIN");
  let count = 0;
  try {
    for (const tv of tvs) {
      insert.run(...COLUMNS.map((c) => toCell(c, tv[c])));
      count += 1;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const stats = db.prepare(`
    SELECT COUNT(*) AS tvs,
           COUNT(DISTINCT brand) AS brands,
           MIN(size) AS minSize, MAX(size) AS maxSize
    FROM tvs
  `).get();

  console.log(`Вчитани ${count} телевизори во ${DB_FILE}`);
  console.log(`  брендови: ${stats.brands}   големини: ${stats.minSize}"–${stats.maxSize}"`);
  console.log(`  големина на базата: ${(fs.statSync(DB_FILE).size / 1024).toFixed(0)} KB`);

  db.close();
}

main();
