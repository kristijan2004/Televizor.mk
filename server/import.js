// Ги вчитува телевизорите од src/Data/masterTvs.json во SQLite.
//
// Може да се пушти повторно колку сакаш: базата се полни одново секој пат,
// па masterTvs.json останува изворот на вистината. Ништо не се менува во JSON.
//
//   node import.js
//   node import.js --db /пат/до/display.db

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, DB_FILE } from "./db.js";
import { COLUMNS, toCell } from "./tvRows.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MASTER = path.join(__dirname, "..", "src", "Data", "masterTvs.json");

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
