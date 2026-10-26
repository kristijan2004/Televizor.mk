// Ноќна проверка: дали некој телевизор што некој следи поевтинел.
//
// Се пушта по промоцијата (ПРЕКУ nightly.sh), откако live/masterTvs.json и
// базата веќе се свежи. За секој ПОТВРДЕН ред во `favorites`, ја споредува
// моменталната најевтина цена со last_notified_price (цената при
// претходното известување, не при додавањето — види коментар во schema.sql).
// При пад, се собираат по е-пошта (еден прима ЕДНА е-пошта со сите паднати
// модели, не по еден мејл за секој), а last_notified_price се ажурира само
// за оние што навистина се пријавени.
//
// Пушти: node scripts/notifyPriceDrops.js

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { openDb } from "../server/db.js";
import { sendEmail } from "../server/sendEmail.js";
import { cheapestPrice } from "../server/priceOf.js";
import { formatPrice } from "../src/lib/tvSpecs.js";
import { tvPath } from "../src/lib/tvPath.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DISPLAY_MK_DATA || path.join(ROOT, "src", "Data");

const masterTvs = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "masterTvs.json"), "utf8")
);
const tvById = new Map(masterTvs.map((tv) => [tv.id, tv]));

const db = openDb();

const favorites = db.prepare("SELECT * FROM favorites WHERE confirmed = 1").all();

const byEmail = new Map();
let dropCount = 0;

for (const fav of favorites) {
  const tv = tvById.get(fav.tv_id);
  if (!tv) continue; // трговецот/моделот веќе го нема - нема за што да се извести

  const price = cheapestPrice(tv.stores);
  if (price === null) continue;

  if (fav.last_notified_price !== null && price < fav.last_notified_price) {
    const drop = {
      favId: fav.id,
      tv,
      from: fav.last_notified_price,
      to: price,
      unsubToken: fav.unsub_token,
    };

    if (!byEmail.has(fav.email)) byEmail.set(fav.email, []);
    byEmail.get(fav.email).push(drop);
    dropCount += 1;
  }
}

if (byEmail.size === 0) {
  console.log("  нема паднати цени кај следените телевизори");
  process.exit(0);
}

console.log(`  ${dropCount} паднати цени кај ${byEmail.size} е-пошти`);

let sent = 0;
let failed = 0;

// last_notified_price се ажурира само за редови чија е-пошта навистина
// излезе успешно; инаку следната ноќ ќе се обиде пак со истата (постара)
// референтна цена наместо тивко да „заборави" на пропуштениот пад.
const update = db.prepare("UPDATE favorites SET last_notified_price = ? WHERE id = ?");

for (const [email, drops] of byEmail) {
  const lines = drops.map(
    (d) =>
      `${d.tv.brand} ${d.tv.model}: ${formatPrice(d.from)} -> ${formatPrice(d.to)}\n` +
      `https://display.mk${tvPath(d.tv)}`
  );

  // Секоја ставка си го носи својот линк за отпишување — различни телевизори
  // може да имаат различни unsub токени ако следењето почнало одделно.
  const unsubLines = [...new Set(drops.map((d) => d.unsubToken))].map(
    (token) => `https://display.mk/api/favorites/unsubscribe?token=${token}`
  );

  try {
    await sendEmail({
      to: email,
      subject:
        drops.length === 1
          ? `Цената падна — ${drops[0].tv.brand} ${drops[0].tv.model}`
          : `Цената падна кај ${drops.length} телевизори што ги следиш`,
      text:
        `Добри вести:\n\n${lines.join("\n\n")}\n\n` +
        `За да се отпишеш:\n${unsubLines.join("\n")}`,
    });

    sent += 1;
    for (const d of drops) update.run(d.to, d.favId);
  } catch (err) {
    failed += 1;
    console.error(`  ❌ не успеа е-пошта до ${email}: ${err.message}`);
  }
}

console.log(`  ✓ испратени ${sent} е-пошти${failed ? `, ${failed} неуспешни` : ""}`);

if (failed > 0 && sent === 0) {
  process.exit(1);
}
