// Заеднички облик на еден ред во табелата `tvs`: кои полиња постојат, кои се
// JSON/boolean, и претворање во двете насоки (JS <-> SQLite).
//
// Се користи и од import.js (полнење на целата база од masterTvs.json) и
// од admin.js (уредување на еден ред), за да не се дуплира логиката и
// двете да останат исти кога некогаш ќе се додаде поле.

export const COLUMNS = [
  "id", "brand", "model", "size", "technology", "resolution", "refreshRate",
  "year", "os", "hdr", "dolbyVision", "hdmi", "usb", "vrr", "allm",
  "pictureProcessor", "hdrFormats", "brightness", "audioPower",
  "audioChannels", "dolbyAtmos", "freeSync", "gSync", "image", "stores",
  "specsSource",
];

export const JSON_FIELDS = ["hdrFormats", "stores"];

export const BOOL_FIELDS = [
  "hdr", "dolbyVision", "vrr", "allm",
  "dolbyAtmos", "freeSync", "gSync",
];

/*
  Полиња што администраторот смее да ги уредува преку админ-панелот.
  Намерно БЕЗ id, brand, model и stores: првите три го носат идентитетот и
  URL-то на телевизорот (менувањето би го расипало sitemap-от и линковите),
  а stores доаѓа исклучиво од скриптите за трговците.
*/
export const EDITABLE_FIELDS = [
  "size", "technology", "resolution", "refreshRate", "year", "os",
  "hdr", "dolbyVision", "hdmi", "usb", "vrr", "allm",
  "pictureProcessor", "hdrFormats", "brightness", "audioPower",
  "audioChannels", "dolbyAtmos", "freeSync", "gSync", "image", "specsSource",
];

// JS вредност -> ќелија за SQLite (null/number/string/bigint/Buffer).
export function toCell(field, value) {
  if (JSON_FIELDS.includes(field)) {
    return JSON.stringify(value ?? (field === "stores" ? {} : []));
  }

  if (BOOL_FIELDS.includes(field)) {
    return value === true ? 1 : 0;
  }

  if (value === undefined || value === null) return null;

  if (typeof value === "object") return JSON.stringify(value);

  return value;
}

// Ред од SQLite -> облик каков што го чека апликацијата (вистински
// true/false и листи наместо текст).
export function hydrateRow(row) {
  if (!row) return null;

  const out = { ...row };

  for (const f of JSON_FIELDS) {
    if (f in out) {
      try {
        out[f] = JSON.parse(out[f] ?? "null");
      } catch {
        out[f] = f === "stores" ? {} : [];
      }
    }
  }

  for (const f of BOOL_FIELDS) {
    if (f in out) out[f] = out[f] === 1;
  }

  return out;
}
