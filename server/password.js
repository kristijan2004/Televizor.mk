// Хаширање на лозинки со scrypt (вграден во Node, нема нов пакет).
//
// scrypt е признаен алтернативен механизам кон Argon2id (OWASP Password
// Storage Cheat Sheet) — тука е избран конкретно затоа што е во самото Node,
// без нативен модул за компајлирање, исто како причината зошто серверот
// користи node:sqlite наместо better-sqlite3.
//
// Чуваната низа го носи алгоритмот и параметрите, за да може подоцна да се
// зголемат трошоците (N) без да се расипат старите хешови:
//   scrypt$N$r$p$сол(hex)$хеш(hex)

import crypto from "node:crypto";

const N = 16384; // 2^14 — ~16MB меморија по хеш, под Node-овиот default maxmem
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/*
  Секогаш враќа true/false, никогаш не фрла — грешка во форматот значи
  „не се совпаѓа", не паѓа на серверот.
*/
export function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const [, n, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");

    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/*
  Хеш на случајна лозинка, пресметан еднаш при подигање на серверот.
  Се користи кога корисничкото име не постои, за да проверката сепак помине
  низ scrypt и времето на одговор да не оддаде дали името е точно.
*/
export const DUMMY_HASH = hashPassword(crypto.randomBytes(32).toString("hex"));
