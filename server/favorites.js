// „Следи ја цената" — известување по е-пошта кога цената на телевизор падне.
//
// Регистриран во index.js со префикс /api/favorites.
//
// Двојна потврда: POST /favorites само запишува неодобрен ред и праќа
// е-пошта со линк; тој линк (GET /favorites/confirm) е единственото нешто
// што навистина го активира следењето. Без ова, било кој би можел да внесе
// туѓа е-пошта и да ја претплати на известувања за случаен телевизор.
//
// MAX_PER_EMAIL го спречува истото да наполни илјадници редови — 5 е доволно
// за вистински купувач што споредува неколку модели.

import crypto from "node:crypto";

import { sendEmail } from "./sendEmail.js";
import { cheapestPrice } from "./priceOf.js";
import { hydrateRow } from "./tvRows.js";
import { formatPrice } from "../src/lib/tvSpecs.js";
import { tvPath } from "../src/lib/tvPath.js";

const MAX_PER_EMAIL = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SITE = "https://display.mk";

const page = (title, body) => `<!doctype html>
<html lang="mk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Display.mk</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f8; color: #2a2a3c;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  main { max-width: 440px; padding: 32px; background: #fff; border-radius: 16px;
         border: 1px solid #e4e4ee; text-align: center; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  p { line-height: 1.6; color: #5a5a6c; }
  a { color: #242582; font-weight: 700; }
</style></head>
<body><main>${body}</main></body></html>`;

export default async function favoritesPlugin(app, opts) {
  const { db, getTvById } = opts;

  app.post(
    "/",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute", keyGenerator: (r) => r.ip } },
    },
    async (request, reply) => {
      const { tvId, email } = request.body || {};

      if (typeof tvId !== "string" || typeof email !== "string" || !EMAIL_RE.test(email)) {
        return reply.code(400).send({ error: "Невалидни податоци." });
      }

      const cleanEmail = email.trim().toLowerCase();

      const tv = getTvById(tvId);
      if (!tv) {
        return reply.code(404).send({ error: "Нема таков телевизор." });
      }

      const existing = db
        .prepare("SELECT * FROM favorites WHERE tv_id = ? AND email = ?")
        .get(tvId, cleanEmail);

      if (existing?.confirmed) {
        return { ok: true, status: "already-following", unsubToken: existing.unsub_token };
      }

      if (!existing) {
        const { count } = db
          .prepare("SELECT COUNT(*) AS count FROM favorites WHERE email = ?")
          .get(cleanEmail);

        if (count >= MAX_PER_EMAIL) {
          return reply
            .code(400)
            .send({ error: `Веќе следиш ${MAX_PER_EMAIL} телевизори со оваа е-пошта.` });
        }
      }

      const confirmToken = crypto.randomBytes(24).toString("hex");
      const unsubToken = existing?.unsub_token || crypto.randomBytes(24).toString("hex");
      const now = Date.now();

      if (existing) {
        db.prepare(
          "UPDATE favorites SET confirm_token = ?, created_at = ? WHERE id = ?"
        ).run(confirmToken, now, existing.id);
      } else {
        db.prepare(
          `INSERT INTO favorites (tv_id, email, confirmed, confirm_token, unsub_token, created_at)
           VALUES (?, ?, 0, ?, ?, ?)`
        ).run(tvId, cleanEmail, confirmToken, unsubToken, now);
      }

      const confirmUrl = `${SITE}/api/favorites/confirm?token=${confirmToken}`;
      const price = cheapestPrice(tv.stores);

      try {
        await sendEmail({
          to: cleanEmail,
          subject: `Потврди следење — ${tv.brand} ${tv.model}`,
          text:
            `Потврди за да те известиме кога цената на ${tv.brand} ${tv.model}` +
            `${price !== null ? ` (моментално ${formatPrice(price)})` : ""} ќе падне:\n\n` +
            `${confirmUrl}\n\n` +
            `Ако не си побарал ова, слободно игнорирај ја оваа порака.`,
        });
      } catch (err) {
        request.log.error(err, "favorites: испраќањето на потврдата не успеа");
        return reply.code(502).send({ error: "Е-поштата не можеше да се испрати. Пробај повторно." });
      }

      return { ok: true, status: "confirm-sent" };
    }
  );

  app.get("/confirm", async (request, reply) => {
    const { token } = request.query || {};

    const row = token
      ? db.prepare("SELECT * FROM favorites WHERE confirm_token = ? AND confirmed = 0").get(token)
      : null;

    if (!row) {
      reply.type("text/html");
      return page(
        "Невалиден линк",
        "<h1>Линкот е невалиден или е веќе искористен.</h1><p><a href=\"/\">Назад на Display.mk</a></p>"
      );
    }

    const tv = getTvById(row.tv_id);
    const price = tv ? cheapestPrice(tv.stores) : null;

    db.prepare(
      "UPDATE favorites SET confirmed = 1, confirmed_at = ?, confirm_token = NULL, last_notified_price = ? WHERE id = ?"
    ).run(Date.now(), price, row.id);

    const tvUrl = tv ? `${SITE}${tvPath(tv)}` : "/";
    const unsubUrl = `${SITE}/api/favorites/unsubscribe?token=${row.unsub_token}`;

    reply.type("text/html");
    return page(
      "Потврдено",
      `<h1>✓ Потврдено</h1><p>Ќе те известиме на ${row.email} кога цената ` +
        `${tv ? `на ${tv.brand} ${tv.model}` : "на овој телевизор"} ќе падне.</p>` +
        `<p><a href="${tvUrl}">Погледни го телевизорот →</a></p>` +
        `<p style="margin-top:20px"><a href="${unsubUrl}" style="color:#999;font-weight:400;font-size:13px">Откажи го следењето</a></p>`
    );
  });

  app.get("/unsubscribe", async (request, reply) => {
    const { token } = request.query || {};

    if (token) {
      db.prepare("DELETE FROM favorites WHERE unsub_token = ?").run(token);
    }

    reply.type("text/html");
    return page(
      "Отпишано",
      "<h1>Отпишано</h1><p>Нема повеќе да добиваш известувања за овој телевизор.</p>" +
        "<p><a href=\"/\">Назад на Display.mk</a></p>"
    );
  });
}
