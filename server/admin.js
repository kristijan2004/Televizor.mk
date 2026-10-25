// Административен панел: најава, сесии, уредување телевизори, историја.
//
// Регистриран во index.js како плагин со префикс /api/admin. Автентикацијата
// е проверка на серверот (сесија во SQLite), не во прелистувачот.
//
// Безбедносен модел:
//   - Лозинката е хаширана со scrypt (password.js), никогаш обичен текст.
//   - Сесијата е случаен 256-битен токен во HttpOnly+Secure колаче,
//     проверуван во базата на секое барање. Истекува по 8 часа.
//   - CSRF: втор токен во читливо (не HttpOnly) колаче; секое барање што
//     менува податоци мора да го врати во заглавие X-CSRF-Token.
//   - Најавата е ограничена по IP (@fastify/rate-limit, веќе во проектот).
//   - Грешките кон клиентот се општи пораки; вистинската порака оди само
//     во server-side логот (request.log), никогаш до прелистувачот.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { verifyPassword, DUMMY_HASH } from "./password.js";
import { parseCookies, serializeCookie, clearCookie } from "./cookies.js";
import { COLUMNS, EDITABLE_FIELDS, JSON_FIELDS, BOOL_FIELDS, toCell, hydrateRow } from "./tvRows.js";
import { SPECIAL_FEATURE_KEYS } from "../src/lib/specialFeatures.js";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 часа
const SESSION_COOKIE = "admin_session";
const CSRF_COOKIE = "admin_csrf";

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function cookieOpts(request, extra = {}) {
  return { secure: request.protocol === "https", ...extra };
}

/*
  Проверки по поле. Намерно построги отколку „прифати сè": серверот е
  последната линија пред податоците да завршат во живата база.
*/
const CURRENT_YEAR = new Date().getFullYear();

function validateField(field, value) {
  if (BOOL_FIELDS.includes(field)) {
    return typeof value === "boolean" ? { ok: true, value } : { ok: false };
  }

  if (field === "hdrFormats") {
    if (!Array.isArray(value) || value.length > 10) return { ok: false };
    if (!value.every((v) => typeof v === "string" && v.length <= 30)) return { ok: false };
    return { ok: true, value: value.map((v) => v.trim()).filter(Boolean) };
  }

  if (field === "specialFeatures") {
    if (!Array.isArray(value)) return { ok: false };
    if (!value.every((v) => SPECIAL_FEATURE_KEYS.includes(v))) return { ok: false };
    return { ok: true, value: [...new Set(value)] };
  }

  if (field === "size") {
    const n = Number(value);
    return Number.isInteger(n) && n >= 8 && n <= 200 ? { ok: true, value: n } : { ok: false };
  }

  if (field === "refreshRate") {
    if (value === null) return { ok: true, value: null };
    const n = Number(value);
    return Number.isInteger(n) && n >= 24 && n <= 480 ? { ok: true, value: n } : { ok: false };
  }

  if (field === "year") {
    const n = Number(value);
    return Number.isInteger(n) && n >= 2010 && n <= CURRENT_YEAR + 2
      ? { ok: true, value: n }
      : { ok: false };
  }

  if (["hdmi", "usb", "audioPower"].includes(field)) {
    if (value === null) return { ok: true, value: null };
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 50 ? { ok: true, value: n } : { ok: false };
  }

  // Останатите editable полиња се текст: technology, resolution, os,
  // pictureProcessor, brightness, audioChannels, image, specsSource.
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };

  const trimmed = value.trim();
  const maxLen = field === "image" ? 500 : 80;

  return trimmed.length <= maxLen ? { ok: true, value: trimmed || null } : { ok: false };
}

export default async function adminPlugin(app, opts) {
  const { db, dataDir } = opts;
  const MASTER_FILE = path.join(dataDir, "masterTvs.json");
  const PENDING_FILE = path.join(dataDir, "pendingTvs.json");
  const REJECTED_FILE = path.join(dataDir, "rejectedTvs.json");

  function readJsonArray(file) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return [];
    }
  }

  function writeJsonArray(file, arr) {
    fs.writeFileSync(file, JSON.stringify(arr, null, 2) + "\n", "utf8");
  }

  // Застарени сесии се бришат мрзливо — нема потреба од cron за ова.
  db.exec(`DELETE FROM admin_sessions WHERE expires_at < ${Date.now()}`);

  function createSession(userId) {
    const id = crypto.randomBytes(32).toString("hex");
    const csrfToken = crypto.randomBytes(32).toString("hex");
    const now = Date.now();

    db.prepare(
      `INSERT INTO admin_sessions (id, user_id, csrf_token, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, csrfToken, now, now + SESSION_TTL_MS);

    return { id, csrfToken };
  }

  function getSession(sessionId) {
    if (!sessionId) return null;

    const row = db.prepare("SELECT * FROM admin_sessions WHERE id = ?").get(sessionId);
    if (!row) return null;

    if (row.expires_at < Date.now()) {
      db.prepare("DELETE FROM admin_sessions WHERE id = ?").run(sessionId);
      return null;
    }

    return row;
  }

  /*
    Автентикација за сите рути во овој плагин ОСВЕН оние означени со
    config.public — најавата мора да биде достапна без сесија.
  */
  app.addHook("preHandler", async (request, reply) => {
    if (request.routeOptions?.config?.public) return;

    const cookies = parseCookies(request.headers.cookie);
    const session = getSession(cookies[SESSION_COOKIE]);

    if (!session) {
      return reply.code(401).send({ error: "Не си најавен." });
    }

    request.adminSession = session;

    // Пишувачки операции бараат и CSRF заглавие, не само важечка сесија.
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const header = request.headers["x-csrf-token"];
      if (!header || !timingSafeEqualStr(header, session.csrf_token)) {
        return reply.code(403).send({ error: "Невалидна сесија. Освежи ја страницата." });
      }
    }
  });

  app.post(
    "/login",
    {
      config: {
        public: true,
        // Ограничување на обидите за најава — 5 обиди на 15 минути по IP.
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
          keyGenerator: (request) =>
            request.headers["cf-connecting-ip"] || request.headers["x-real-ip"] || request.ip,
        },
      },
    },
    async (request, reply) => {
      const body = request.body || {};
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!username || !password) {
        return reply.code(400).send({ error: "Внеси корисничко име и лозинка." });
      }

      const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);

      /*
        Секогаш се повикува verifyPassword, дури и кога корисникот не
        постои (против DUMMY_HASH) — истото времетраење, иста порака,
        за да одговорот не издаде дали корисничкото име е точно.
      */
      const valid = user
        ? verifyPassword(password, user.password_hash)
        : (verifyPassword(password, DUMMY_HASH), false);

      if (!valid) {
        return reply.code(401).send({ error: "Погрешно корисничко име или лозинка." });
      }

      const session = createSession(user.id);

      reply.raw.setHeader("Set-Cookie", [
        serializeCookie(SESSION_COOKIE, session.id, {
          ...cookieOpts(request, { httpOnly: true, sameSite: "Strict" }),
          maxAge: Math.floor(SESSION_TTL_MS / 1000),
        }),
        serializeCookie(CSRF_COOKIE, session.csrfToken, {
          ...cookieOpts(request, { httpOnly: false, sameSite: "Strict" }),
          maxAge: Math.floor(SESSION_TTL_MS / 1000),
        }),
      ]);

      return { ok: true, username: user.username };
    }
  );

  app.post("/logout", async (request, reply) => {
    db.prepare("DELETE FROM admin_sessions WHERE id = ?").run(request.adminSession.id);

    reply.raw.setHeader("Set-Cookie", [
      clearCookie(SESSION_COOKIE, cookieOpts(request, { httpOnly: true, sameSite: "Strict" })),
      clearCookie(CSRF_COOKIE, cookieOpts(request, { httpOnly: false, sameSite: "Strict" })),
    ]);

    return { ok: true };
  });

  app.get("/me", async (request) => {
    const user = db
      .prepare("SELECT username FROM admin_users WHERE id = ?")
      .get(request.adminSession.user_id);

    return { username: user?.username ?? null };
  });

  app.post("/change-password", async (request, reply) => {
    const body = request.body || {};
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";

    if (next.length < 12) {
      return reply.code(400).send({ error: "Новата лозинка мора да има барем 12 знаци." });
    }

    const user = db
      .prepare("SELECT * FROM admin_users WHERE id = ?")
      .get(request.adminSession.user_id);

    if (!user || !verifyPassword(current, user.password_hash)) {
      return reply.code(401).send({ error: "Тековната лозинка не е точна." });
    }

    const { hashPassword } = await import("./password.js");
    db.prepare("UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      hashPassword(next),
      Date.now(),
      user.id
    );

    return { ok: true };
  });

  /*
    Anhoch не се чита автоматски (зад Cloudflare challenge што ги блокира
    серверските IP адреси — види scripts/anhoch.sh) — некој мора да го
    пушти рачно, од дома. Ова само го покажува колку е застарено, не го
    пушта: датумот на модификација на anhochTvs.json е последниот пат кога
    некој навистина го извршил скриптот.
  */
  app.get("/anhoch-status", async () => {
    const file = path.join(dataDir, "anhochTvs.json");

    try {
      const stat = fs.statSync(file);
      const count = JSON.parse(fs.readFileSync(file, "utf8")).length;
      const days = Math.floor((Date.now() - stat.mtimeMs) / 86400000);

      return { lastUpdated: stat.mtimeMs, daysAgo: days, productCount: count };
    } catch {
      return { lastUpdated: null, daysAgo: null, productCount: 0 };
    }
  });

  app.get("/stats", async () => {
    const { total } = db.prepare("SELECT COUNT(*) AS total FROM tvs").get();
    const { verified } = db
      .prepare("SELECT COUNT(*) AS verified FROM tvs WHERE specsSource = 'рачно'")
      .get();
    const { brands } = db.prepare("SELECT COUNT(DISTINCT brand) AS brands FROM tvs").get();
    const { noBrightness } = db
      .prepare("SELECT COUNT(*) AS noBrightness FROM tvs WHERE brightness IS NULL OR brightness = '' OR brightness = '—'")
      .get();
    const { edits } = db.prepare("SELECT COUNT(*) AS edits FROM admin_audit_log").get();
    const pending = readJsonArray(PENDING_FILE).length;

    const recent = db
      .prepare("SELECT tv_id, brand, model, changed_by, changed_at FROM admin_audit_log ORDER BY changed_at DESC LIMIT 5")
      .all();

    return {
      totalTvs: total,
      verifiedTvs: verified,
      brands,
      missingBrightness: noBrightness,
      totalEdits: edits,
      pendingTvs: pending,
      recentEdits: recent,
    };
  });

  app.get("/tvs", async (request) => {
    const q = request.query || {};
    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (q.search && String(q.search).trim()) {
      const words = String(q.search).trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
      for (const word of words) {
        where.push("LOWER(brand || ' ' || model) LIKE ?");
        params.push(`%${word}%`);
      }
    }

    if (q.verified === "0") {
      where.push("(specsSource IS NULL OR specsSource != 'рачно')");
    } else if (q.verified === "1") {
      where.push("specsSource = 'рачно'");
    }

    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM tvs ${clause}`).get(...params);
    const rows = db
      .prepare(
        `SELECT id, brand, model, size, technology, specsSource FROM tvs ${clause}
         ORDER BY brand, model LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return { items: rows, total, page, limit };
  });

  app.get("/tvs/:id", async (request, reply) => {
    const row = db.prepare("SELECT * FROM tvs WHERE id = ?").get(request.params.id);
    if (!row) return reply.code(404).send({ error: "Телевизорот не е пронајден." });
    return hydrateRow(row);
  });

  app.put("/tvs/:id", async (request, reply) => {
    const { id } = request.params;
    const existing = db.prepare("SELECT * FROM tvs WHERE id = ?").get(id);

    if (!existing) return reply.code(404).send({ error: "Телевизорот не е пронајден." });

    const body = request.body || {};
    if (typeof body !== "object" || Array.isArray(body)) {
      return reply.code(400).send({ error: "Неисправни податоци." });
    }

    const current = hydrateRow(existing);
    const sets = [];
    const params = [];
    const diff = {};

    for (const field of Object.keys(body)) {
      if (!EDITABLE_FIELDS.includes(field)) {
        return reply.code(400).send({ error: `Полето „${field}" не смее да се уредува.` });
      }

      const check = validateField(field, body[field]);
      if (!check.ok) {
        return reply.code(400).send({ error: `Невалидна вредност за „${field}".` });
      }

      const before = current[field];
      const beforeKey = JSON_FIELDS.includes(field) ? JSON.stringify(before) : before;
      const afterKey = JSON_FIELDS.includes(field) ? JSON.stringify(check.value) : check.value;

      if (beforeKey === afterKey) continue; // ништо не се смени за ова поле

      sets.push(`${field} = ?`);
      params.push(toCell(field, check.value));
      diff[field] = { before, after: check.value };
    }

    if (sets.length === 0) {
      return { ...current, unchanged: true };
    }

    params.push(id);

    try {
      db.exec("BEGIN");
      db.prepare(`UPDATE tvs SET ${sets.join(", ")} WHERE id = ?`).run(...params);

      /*
        Истата промена оди и во masterTvs.json на дискот, не само во базата.
        Инаку ноќното скрапирање (node import.js во nightly.sh) ќе ја избрише
        рачната измена при следната промоција — таа секогаш полни одново
        целата табела од JSON-от.
      */
      const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf8"));
      const index = master.findIndex((tv) => tv.id === id);

      if (index !== -1) {
        for (const field of Object.keys(diff)) {
          master[index][field] = diff[field].after;
        }
        fs.writeFileSync(MASTER_FILE, JSON.stringify(master, null, 2) + "\n", "utf8");
      }

      db.prepare(
        `INSERT INTO admin_audit_log (tv_id, brand, model, changed_by, changed_at, diff)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        existing.brand,
        existing.model,
        request.adminUsername || "admin",
        Date.now(),
        JSON.stringify(diff)
      );

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      request.log.error(error, "admin tv update failed");
      return reply.code(500).send({ error: "Настана грешка при зачувување." });
    }

    const updated = db.prepare("SELECT * FROM tvs WHERE id = ?").get(id);
    return hydrateRow(updated);
  });

  /*
    Телевизори на чекање одобрување.

    scripts/nightly.sh секој НОВ модел (не бил претходно жив) го праќа тука
    наместо право на сајтот — дури и кога веќе има целосни спецификации,
    админ сака прво да ги погледне. Постоечките телевизори никогаш не се
    допираат овде. Записите се во pendingTvs.json — плоснат JSON, не табела
    во базата, зашто ноќниот скрипт веќе работи со вакви JSON фајлови
    директно (исто како masterTvs.json), без притоа да ја допира SQLite
    базата додека API-то можеби работи.

    Секој запис: { tv: {...истиот облик како во masterTvs.json}, reasons,
    discoveredAt }. Одбивањето се памети во rejectedTvs.json за да
    nightly.sh не го предложи истиот модел секоја ноќ одново.
  */
  app.get("/pending-tvs", async () => {
    const items = readJsonArray(PENDING_FILE);
    return { items, total: items.length };
  });

  app.get("/pending-tvs/:id", async (request, reply) => {
    const items = readJsonArray(PENDING_FILE);
    const entry = items.find((p) => p.tv.id === request.params.id);
    if (!entry) return reply.code(404).send({ error: "Записот не е пронајден." });
    return entry;
  });

  app.put("/pending-tvs/:id", async (request, reply) => {
    const { id } = request.params;
    const items = readJsonArray(PENDING_FILE);
    const index = items.findIndex((p) => p.tv.id === id);

    if (index === -1) return reply.code(404).send({ error: "Записот не е пронајден." });

    const body = request.body || {};
    if (typeof body !== "object" || Array.isArray(body)) {
      return reply.code(400).send({ error: "Неисправни податоци." });
    }

    const tv = { ...items[index].tv };

    for (const field of Object.keys(body)) {
      if (!EDITABLE_FIELDS.includes(field)) {
        return reply.code(400).send({ error: `Полето „${field}" не смее да се уредува.` });
      }

      const check = validateField(field, body[field]);
      if (!check.ok) {
        return reply.code(400).send({ error: `Невалидна вредност за „${field}".` });
      }

      tv[field] = check.value;
    }

    items[index] = { ...items[index], tv };
    writeJsonArray(PENDING_FILE, items);

    return items[index];
  });

  app.post("/pending-tvs/:id/approve", async (request, reply) => {
    const { id } = request.params;
    const items = readJsonArray(PENDING_FILE);
    const index = items.findIndex((p) => p.tv.id === id);

    if (index === -1) return reply.code(404).send({ error: "Записот не е пронајден." });

    const { tv } = items[index];

    // Истата причина поради која овде чека — не смее да замине на сајтот
    // сè додека тоа не се поправи.
    const missing = [];
    if (!tv.size) missing.push("големина");
    if (!tv.image) missing.push("слика");
    if (missing.length) {
      return reply
        .code(400)
        .send({ error: `Пред одобрување, пополни: ${missing.join(", ")}.` });
    }

    if (db.prepare("SELECT 1 FROM tvs WHERE id = ?").get(id)) {
      return reply.code(409).send({ error: "Веќе постои телевизор со истиот id." });
    }

    try {
      db.exec("BEGIN");

      db.prepare(
        `INSERT INTO tvs (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`
      ).run(...COLUMNS.map((c) => toCell(c, tv[c])));

      const master = readJsonArray(MASTER_FILE);
      master.push(tv);
      writeJsonArray(MASTER_FILE, master);

      const remaining = items.filter((_, i) => i !== index);
      writeJsonArray(PENDING_FILE, remaining);

      db.prepare(
        `INSERT INTO admin_audit_log (tv_id, brand, model, changed_by, changed_at, diff)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        tv.brand,
        tv.model,
        request.adminUsername || "admin",
        Date.now(),
        JSON.stringify({ action: "одобрен од чекање" })
      );

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      request.log.error(error, "pending tv approve failed");
      return reply.code(500).send({ error: "Настана грешка при одобрување." });
    }

    return { ok: true };
  });

  app.post("/pending-tvs/:id/reject", async (request, reply) => {
    const { id } = request.params;
    const items = readJsonArray(PENDING_FILE);
    const index = items.findIndex((p) => p.tv.id === id);

    if (index === -1) return reply.code(404).send({ error: "Записот не е пронајден." });

    const { tv } = items[index];

    const rejected = readJsonArray(REJECTED_FILE);
    rejected.push({
      id,
      brand: tv.brand,
      model: tv.model,
      rejectedAt: Date.now(),
      rejectedBy: request.adminUsername || "admin",
    });
    writeJsonArray(REJECTED_FILE, rejected);

    const remaining = items.filter((_, i) => i !== index);
    writeJsonArray(PENDING_FILE, remaining);

    db.prepare(
      `INSERT INTO admin_audit_log (tv_id, brand, model, changed_by, changed_at, diff)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      tv.brand,
      tv.model,
      request.adminUsername || "admin",
      Date.now(),
      JSON.stringify({ action: "одбиен" })
    );

    return { ok: true };
  });

  app.get("/history", async (request) => {
    const q = request.query || {};
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const offset = (page - 1) * limit;

    const where = q.tvId ? "WHERE tv_id = ?" : "";
    const params = q.tvId ? [q.tvId] : [];

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM admin_audit_log ${where}`)
      .get(...params);

    const rows = db
      .prepare(
        `SELECT id, tv_id, brand, model, changed_by, changed_at, diff
         FROM admin_audit_log ${where} ORDER BY changed_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return {
      items: rows.map((r) => ({ ...r, diff: JSON.parse(r.diff) })),
      total,
      page,
      limit,
    };
  });

  // request.adminUsername за пријавување во историјата — се полни по /me.
  app.addHook("preHandler", async (request) => {
    if (!request.adminSession) return;
    const user = db
      .prepare("SELECT username FROM admin_users WHERE id = ?")
      .get(request.adminSession.user_id);
    request.adminUsername = user?.username;
  });
}
