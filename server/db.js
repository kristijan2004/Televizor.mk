// Отвора ја базата и ја создава шемата ако ја нема.
//
// Се користи вградениот node:sqlite наместо better-sqlite3: нема нативен
// модул за компајлирање, па на серверот нема потреба од build алатки.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_FILE = process.env.DISPLAY_MK_DB || path.join(__dirname, "display.db");

export function openDb({ create = true } = {}) {
  const db = new DatabaseSync(DB_FILE);

  // WAL: читањата не се блокираат додека скриптите пишуваат во базата.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  if (create) {
    db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

    // CREATE TABLE IF NOT EXISTS не додава колони на постоечка табела, па
    // нови полиња во schema.sql не стигнуваат до живата база сами.
    ensureColumn(db, "tvs", "specialFeatures", "TEXT");
  }

  return db;
}

function ensureColumn(db, table, column, type) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export { DB_FILE };
