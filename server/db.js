// Отвора ја базата и ја создава шемата ако ја нема.
//
// Се користи вградениот node:sqlite наместо better-sqlite3: нема нативен
// модул за компајлирање, па на серверот нема потреба од build алатки.

const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const DB_FILE = process.env.DISPLAY_MK_DB || path.join(__dirname, "display.db");

function openDb({ create = true } = {}) {
  const db = new DatabaseSync(DB_FILE);

  // WAL: читањата не се блокираат додека скриптите пишуваат во базата.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  if (create) {
    db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  }

  return db;
}

module.exports = { openDb, DB_FILE };
