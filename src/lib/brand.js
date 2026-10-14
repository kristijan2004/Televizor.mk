/*
  Брендовите во masterTvs.json се со голема буква (PHILIPS, HISENSE, ...).
  Ова само ги форматира за прикажување (наслови, описи, JSON-LD, UI) —
  никогаш не ги менува суровите податоци, SQL споредбите (LOWER(brand)) или
  каноничната /tv/:brand/:model адреса (tvPath секогаш користи мала буква).
*/
const BRAND_ACRONYMS = new Set(["LG", "TCL", "JVC", "ST"]);

export function displayBrand(brand) {
  const raw = String(brand || "").trim();
  if (!raw) return raw;
  if (BRAND_ACRONYMS.has(raw.toUpperCase())) return raw.toUpperCase();
  return raw
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export default displayBrand;
