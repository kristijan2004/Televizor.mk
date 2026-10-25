/*
 * Познати „посебни карактеристики" (Ambilight и слично) — се чуваат по
 * нивен клуч (specialFeatures: ["ambilight"]), не по текст, за да уредувањето
 * во админ-панелот биде со штиклирање, а не со слободен текст што може да се
 * напише различно секој пат (Ambilight / ambilight / AMBILIGHT).
 *
 * Листата е намерно мала и рачно се дополнува кога стигне нова
 * карактеристика — не треба генерички механизам за ова.
 */
export const SPECIAL_FEATURES = [
  {
    key: "ambilight",
    label: "Ambilight",
    description:
      "Philips-ова технологија: ЛЕД ленти околу рамката на телевизорот ја " +
      "прошируваат сликата со светлина на околниот зид, според боите на екранот.",
  },
];

export const SPECIAL_FEATURE_KEYS = SPECIAL_FEATURES.map((f) => f.key);

export function getSpecialFeature(key) {
  return SPECIAL_FEATURES.find((f) => f.key === key) || null;
}
