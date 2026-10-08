// API за display.mk.
//
// Ги служи телевизорите од SQLite, за да не заминува целата база во JS
// bundle-от. Листата враќа само полиња за плочките; целосните спецификации
// се земаат одделно, по телевизор.
//
//   npm start            (PORT=3001 по дифолт)

const Fastify = require("fastify");
const cors = require("@fastify/cors");
const { openDb } = require("./db");

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";

// Нема bulk endpoint: колку и да побара клиентот, не добива повеќе од ова.
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

const db = openDb();

// Полиња за плочка — тоа што TileCont.js навистина чита.
const LIST_FIELDS = [
  "id", "brand", "model", "size", "technology", "resolution",
  "refreshRate", "vrr", "allm", "image", "stores",
];

const JSON_FIELDS = ["hdrFormats", "stores"];
const BOOL_FIELDS = [
  "hdr", "dolbyVision", "vrr", "allm", "dolbyAtmos", "freeSync", "gSync",
];

// SQLite нема true/false ниту листи — се враќаат во обликот што го чека UI.
function hydrate(row) {
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

const SORTS = {
  newest: "year DESC, brand ASC, model ASC",
  oldest: "year ASC, brand ASC, model ASC",
  "size-small": "size ASC, brand ASC",
  "size-large": "size DESC, brand ASC",
};

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "warn" } });

app.register(cors, { origin: true });

app.get("/api/health", async () => {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM tvs").get();
  return { ok: true, tvs: n };
});

// Опциите за филтрите доаѓаат од податоците, не од тврдо запишана листа —
// нов бренд од скриптите се појавува сам.
app.get("/api/filters", async () => {
  const brands = db.prepare(
    "SELECT brand, COUNT(*) AS count FROM tvs GROUP BY brand ORDER BY count DESC"
  ).all();

  const sizes = db.prepare(
    "SELECT size, COUNT(*) AS count FROM tvs WHERE size IS NOT NULL GROUP BY size ORDER BY size"
  ).all();

  const technologies = db.prepare(
    "SELECT technology, COUNT(*) AS count FROM tvs WHERE technology IS NOT NULL GROUP BY technology ORDER BY count DESC"
  ).all();

  const { total } = db.prepare("SELECT COUNT(*) AS total FROM tvs").get();

  return { total, brands, sizes, technologies };
});

app.get("/api/tvs", async (request) => {
  const q = request.query || {};

  const where = [];
  const params = [];

  if (q.search && String(q.search).trim()) {
    // Исто како во UI: се бара и по бренд и по модел.
    where.push("(LOWER(brand || ' ' || model) LIKE ?)");
    params.push(`%${String(q.search).trim().toLowerCase()}%`);
  }

  if (q.brand) {
    where.push("LOWER(brand) = ?");
    params.push(String(q.brand).toLowerCase());
  }

  if (q.size) {
    where.push("size = ?");
    params.push(Number(q.size));
  }

  if (q.technology) {
    where.push("technology = ?");
    params.push(String(q.technology));
  }

  if (q.refreshRate) {
    where.push("refreshRate >= ?");
    params.push(Number(q.refreshRate));
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order = SORTS[q.sort] || SORTS.newest;

  const limit = Math.min(Math.max(Number(q.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(Number(q.page) || 1, 1);
  const offset = (page - 1) * limit;

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM tvs ${clause}`)
    .get(...params);

  const rows = db
    .prepare(
      `SELECT ${LIST_FIELDS.join(", ")} FROM tvs ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return {
    items: rows.map(hydrate),
    total,
    page,
    limit,
    hasMore: offset + rows.length < total,
  };
});

// За споредба: до 3 телевизори во едно барање.
app.get("/api/tvs/by-id", async (request, reply) => {
  const ids = String(request.query?.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!ids.length) return reply.code(400).send({ error: "ids е потребно" });

  const rows = db
    .prepare(`SELECT * FROM tvs WHERE id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids);

  return { items: rows.map(hydrate) };
});

app.get("/api/tvs/:brand/:model", async (request, reply) => {
  const { brand, model } = request.params;

  const row = db
    .prepare("SELECT * FROM tvs WHERE LOWER(brand) = ? AND LOWER(model) = ?")
    .get(String(brand).toLowerCase(), String(model).toLowerCase());

  if (!row) return reply.code(404).send({ error: "Телевизорот не е пронајден" });

  return hydrate(row);
});

app.listen({ port: PORT, host: HOST }).then(() => {
  console.log(`API на http://${HOST}:${PORT}`);
});
