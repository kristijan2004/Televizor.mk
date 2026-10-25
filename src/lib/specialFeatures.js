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
  {
    key: "acoustic-surface",
    label: "Acoustic Surface Audio+",
    description:
      "Sony-ова технологија (само OLED модели): самото стакло на екранот " +
      "вибрира преку актуатори и го произведува звукот, усогласен со " +
      "позицијата на дејството на сликата.",
  },
  {
    key: "one-connect",
    label: "One Connect Box",
    description:
      "Samsung-ова технологија (премиум Neo QLED / The Frame модели): сите " +
      "приклучоци се во одделна надворешна кутија, до телевизорот води само " +
      "едно тенко кабел, па екранот останува чист за монтирање на зид.",
  },
];

export const SPECIAL_FEATURE_KEYS = SPECIAL_FEATURES.map((f) => f.key);

export function getSpecialFeature(key) {
  return SPECIAL_FEATURES.find((f) => f.key === key) || null;
}
