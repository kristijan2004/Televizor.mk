// API за display.mk.
//
// Ги служи телевизорите од SQLite, за да не заминува целата база во JS
// bundle-от. Листата враќа само полиња за плочките; целосните спецификации
// се земаат одделно, по телевизор.
//
//   npm start            (PORT=3001 по дифолт)

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { openDb } from "./db.js";
import { hydrateRow } from "./tvRows.js";
import adminPlugin from "./admin.js";

/*
  Квизот „Одбери ТВ" се пресметува ТУКА, не во прелистувачот.

  Тој мора да ги оцени сите 514 телевизори за да избере три, па ако работеше
  кај корисникот, целата база ќе мораше да замине кај него — токму тоа што го
  тргнавме. Затоа серверот ги вчитува истите модули што ги користеше
  апликацијата и враќа само готови препораки.
*/
import {
  loadData,
  buildCatalogue,
  getBrandOptions,
  getBudgetOptions,
} from "../src/lib/tvSpecs.js";

import { recommend } from "../src/lib/recommend.js";
import { tvPath } from "../src/lib/tvPath.js";
import { displayBrand } from "../src/lib/brand.js";
import { isPublished } from "../src/lib/isPublished.js";
import { excerptFor } from "../src/lib/excerptFor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";

// Нема bulk endpoint: колку и да побара клиентот, не добива повеќе од ова.
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

const db = openDb();

const DATA_DIR = process.env.DISPLAY_MK_DATA || path.join(__dirname, "..", "src", "Data");

const readJson = (name) => {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) {
    console.warn(`  (нема ${name} — квизот ќе работи со помалку податоци)`);
    return [];
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const masterTvs = readJson("masterTvs.json");

loadData({
  masterTvs,
  anhochTvs: readJson("anhochTvs.json"),
  setecTvs: readJson("setecTvs.json"),
  neptunTvs: readJson("neptunTvs.json"),
  ddstoreTvs: readJson("ddstoreTvs.json"),
});

// Се гради еднаш при подигање, не по барање.
const quizCatalogue = buildCatalogue(masterTvs);
const quizBrands = getBrandOptions(quizCatalogue);
const quizBudgets = getBudgetOptions(quizCatalogue);

// Полиња за плочка — тоа што TileCont.js навистина чита.
const LIST_FIELDS = [
  "id", "brand", "model", "size", "technology", "resolution",
  "refreshRate", "vrr", "allm", "image", "stores",
];

// Истата логика ја користат import.js и admin.js, тука само преименувана.
const hydrate = hydrateRow;

const SORTS = {
  newest: "year DESC, brand ASC, model ASC",
  oldest: "year ASC, brand ASC, model ASC",
  "size-small": "size ASC, brand ASC",
  "size-large": "size DESC, brand ASC",
};

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || "warn" },

  // nginx е пред нас, па без ова секој посетител би изгледал како 127.0.0.1
  // и ограничувањето би важело за сите заедно.
  trustProxy: true,
});

/*
  ВАЖНО: `await`. Без него приклучоците се редат, а рутите се додаваат пред
  тие да се вчитаат — куките не се закачуваат и ограничувањето молчи
  (проверено: 340 барања поминаа со таван од 300).
*/
await app.register(cors, { origin: true });

/*
  Ограничување по IP.

  Да бидеме искрени: ова не спречува копирање. Со 530 телевизори и таван од
  48 по барање, целата база се зема со 12 барања за помалку од секунда.
  Што прави: го прави масовното земање бавно и видливо, наместо бесплатно и
  незабележливо. Вистинската заштита е свежината на податоците.

  Бројките се така што нормално прелистување никогаш не ги допира: едно
  отворање на страницата прави 3 барања, а „Прикажи повеќе" по едно.
*/
const clientIp = (request) =>
  // Cloudflare ја става вистинската адреса тука; X-Real-IP е од nginx.
  request.headers["cf-connecting-ip"] ||
  request.headers["x-real-ip"] ||
  request.ip;

await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute",
  keyGenerator: clientIp,
  addHeadersOnExceeding: { "x-ratelimit-remaining": true },
  errorResponseBuilder: (request, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Премногу барања. Пробај повторно за ${context.after}.`,
  }),
});

/*
  Админ панелот е посебен плагин: сопствена автентикација, сопствени рути,
  регистриран со префикс /api/admin. Не е во јавната навигација.
*/
await app.register(adminPlugin, { prefix: "/api/admin", db, dataDir: DATA_DIR });

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

  // Банерот покажува „N модели · N бренд · N трговци".
  const storeNames = new Set();
  for (const row of db.prepare("SELECT stores FROM tvs").all()) {
    try {
      for (const name of Object.keys(JSON.parse(row.stores || "{}"))) {
        storeNames.add(name);
      }
    } catch {
      /* редот нема валиден JSON — се прескокнува */
    }
  }

  return {
    total,
    brands,
    sizes,
    technologies,
    stores: [...storeNames].sort(),
  };
});

app.get(
  "/api/tvs",
  {
    /*
      Построго од глобалното: ова е единствената патека низ која се вади
      каталогот. 60 во минута е далеку над нормално листање (12 по
      страница, па тоа се 5 страници во секунда), а масовното земање го
      растегнува од секунда на минути и остава трага.
    */
    config: { rateLimit: { max: 60, timeWindow: "1 minute", keyGenerator: clientIp } },
  },
  async (request) => {
  const q = request.query || {};

  const where = [];
  const params = [];

  if (q.search && String(q.search).trim()) {
    /*
      Секој збор посебно, сите мора да се најдат.

      Порано се бараше целата низа како еден дел од „бренд модел", па
      „samsung 55" враќаше 0: моделот е QE55Q80D, значи зборовите не стојат
      еден до друг во тој редослед. Сега „samsung 55", „55 oled" и
      „oled samsung" работат.
    */
    const words = String(q.search)
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);

    for (const word of words) {
      where.push("LOWER(brand || ' ' || model || ' ' || COALESCE(technology,'') || ' ' || COALESCE(resolution,'')) LIKE ?");
      params.push(`%${word}%`);
    }
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
  }
);

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

/*
  Sitemap — се гради од базата при секое барање, па никогаш не застарува.
  Статична датотека би заостанувала секоја ноќ кога скраперите додаваат
  телевизори.
*/
const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SITE = "https://display.mk";

/*
  Двата дела со статии. Истиот код ги служи — разлика е само во адресата и во
  фајлот што го пишува `scripts/buildNews.js`.

  The two article sections. The same code serves both; only the URL and the
  file written by `scripts/buildNews.js` differ.
*/
const ARTICLE_SECTIONS = [
  { name: "novosti", basePath: "/novosti", file: "news.generated.json" },
  { name: "edu", basePath: "/edu", file: "edu.generated.json" },
];

/*
  Се чита при секое барање намерно: `npm run build:news` го презапишува фајлот
  без серверот да се рестартира, па кеш во меморија би служел стари наслови.
*/
/*
  Исто правило како на клиентот (src/Data/news.js/edu.js): статија со иден
  `date`/`publishAt` не постои сè уште. Без ова, sitemap-от и og:/title
  инјектирањето би ја покажале/индексирале статија што вистински посетител ја
  гледа како „не постои".
*/
const readArticles = (section) => {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, section.file), "utf8")
    );
    return (data.articles || []).filter((a) => isPublished(a));
  } catch {
    // Нема статии — останатото сепак работи.
    return [];
  }
};

app.get("/sitemap.xml", async (request, reply) => {
  // Нема вистински lastmod за статичните страници (не се следи кога се
  // последно променети), па подобро отсутен таг отколку измислена денешна
  // дата на секој request — исто како кај телевизорите подолу.
  const urls = [
    { loc: `${SITE}/`, lastmod: null, priority: "1.0", freq: "daily" },
    { loc: `${SITE}/odberi-tv`, lastmod: null, priority: "0.9", freq: "monthly" },
    { loc: `${SITE}/novosti`, lastmod: null, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/edu`, lastmod: null, priority: "0.5", freq: "monthly" },
    { loc: `${SITE}/uslovi`, lastmod: null, priority: "0.3", freq: "yearly" },
  ];

  // Нема updated_at/created_at колона на tvs, па нема вистински lastmod за
  // телевизори — подобро отсутен таг отколку измислена денешна дата.
  for (const row of db.prepare("SELECT brand, model FROM tvs ORDER BY brand, model").all()) {
    urls.push({
      loc: `${SITE}${tvPath(row)}`,
      lastmod: null,
      priority: "0.7",
      freq: "weekly",
    });
  }

  // Статиите живеат во генерираните JSON фајлови, не во базата. `date` е
  // вистински датум на објавување — не денешен датум секогаш.
  for (const section of ARTICLE_SECTIONS) {
    for (const article of readArticles(section)) {
      if (!article.slug) continue;
      urls.push({
        loc: `${SITE}${section.basePath}/${encodeURIComponent(article.slug)}`,
        lastmod: /^\d{4}-\d{2}-\d{2}/.test(article.date || "") ? article.date.slice(0, 10) : null,
        priority: "0.6",
        freq: "monthly",
      });
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${xmlEscape(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
          `<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  reply.header("Content-Type", "application/xml; charset=utf-8");
  reply.header("Cache-Control", "public, max-age=3600");
  return body;
});

/*
  Вистински <title>, опис и og: во HTML-от, по страница.

  Зошто не „prerender" при градење: серверот додава телевизори секоја ноќ
  без ново градење на фронтендот, па подготвените страници веднаш би
  застареле. Овде главата се гради од живата база при секое барање.

  Телото и натаму го исцртува React. Ова го решава тоа што Facebook, Viber
  и слични НЕ извршуваат JavaScript — дотогаш секое споделување го
  покажуваше истиот општ опис.
*/
const INDEX_HTML = process.env.DISPLAY_MK_INDEX || "/var/www/display.mk/index.html";

const DEFAULT_META = {
  title: "Display.mk — Најди го твојот телевизор",
  description:
    "Сите телевизори достапни во Македонија на едно место. Филтрирај по големина и технологија, спореди модели и најди го вистинскиот телевизор според твоите потреби.",
};

const STATIC_META = {
  "/": DEFAULT_META,
  "/odberi-tv": {
    title: "Одбери ТВ — препорака за твојата соба | Display.mk",
    description:
      "Одговори на шест прашања и добиј три телевизори што одговараат на твојата соба, навики и буџет.",
  },
  "/novosti": {
    title: "Новости за телевизори | Display.mk",
    description: "Статии, совети и новости за телевизори на македонски.",
  },
  "/edu": {
    title: "Еду — технологии кај телевизорите | Display.mk",
    description: "Што значат OLED, QLED, Mini LED, HDR, VRR и ALLM, објаснето едноставно.",
  },
  "/uslovi": {
    title: "Услови за користење | Display.mk",
    description:
      "Услови за користење на Display.mk — точност на податоците и правила за автоматско преземање.",
  },
  /*
    Овие мора да стојат тука иако не се интересни за пребарување: сè што не е
    во листата враќа 404, а /compare е вистинска страница на сајтот. Кога ќе
    се додаде нова рута во App.js, додај ја и овде.
  */
  /*
    noindex: страницата зависи од тоа кои телевизори ги избрал посетителот
    (query/state), па секое „издание" на /compare е исто со секое друго за
    Google — нема смисла да се индексира ниту едно.
  */
  "/compare": {
    title: "Спореди телевизори | Display.mk",
    description: "Спореди до три телевизори рамо до рамо — спецификации една до друга.",
    noindex: true,
  },
  "/addTv": {
    title: "Display.mk",
    description: DEFAULT_META.description,
    noindex: true,
  },
  /*
    Не е интересна за пребарување (сопствена најава), но МОРА да стои тука
    или ќе падне во истата замка — види коментарот под metaForPath().
  */
  "/admin": {
    title: "Административен панел | Display.mk",
    description: DEFAULT_META.description,
    noindex: true,
  },
};

/*
  Непознат пат -> { found: true } со општ опис, НЕ 404.

  Порано секој пат што не е во STATIC_META и не се совпаѓа со /tv/ или
  /novosti/ паѓаше во 404 — а тоа ги погоди /compare и /addTv штом се
  додадоа во App.js без да се додадат и тука. 404 треба да значи „овој
  телевизор/статија навистина не постои", не „не знам за овој пат".
*/
function metaForPath(pathname) {
  if (pathname === "/") return { ...STATIC_META["/"], found: true, kind: "home", canonicalPath: "/" };

  if (STATIC_META[pathname]) {
    return { ...STATIC_META[pathname], found: true, kind: "static", canonicalPath: pathname };
  }

  const tv = pathname.match(/^\/tv\/([^/]+)\/([^/]+)\/?$/);
  if (tv) {
    const row = db
      .prepare("SELECT * FROM tvs WHERE LOWER(brand) = ? AND LOWER(model) = ?")
      .get(decodeURIComponent(tv[1]).toLowerCase(), decodeURIComponent(tv[2]).toLowerCase());

    if (!row) return { ...DEFAULT_META, found: false, kind: "tv", canonicalPath: pathname };

    // Каноничната адреса доаѓа од самиот ред во базата (мала буква,
    // enkodiranje), не од патот во барањето — така секој телевизор има само
    // ЕДНА вистинска адреса, а секоја друга форма (голема буква, без
    // enkodiranje) 301-редиректира кон неа.
    const canonicalPath = tvPath(row);

    const bits = [
      `${row.size} инчи`,
      row.technology,
      row.resolution,
      row.refreshRate ? `${row.refreshRate}Hz` : null,
    ].filter(Boolean);

    const brand = displayBrand(row.brand);

    return {
      title: `${brand} ${row.model} — ${row.size}" ${row.technology || ""} | Display.mk`.replace(/\s+/g, " "),
      description: `${brand} ${row.model}: ${bits.join(", ")}. Спецификации и каде е достапен во Македонија.`,
      found: true,
      kind: "tv",
      tv: row,
      image: row.image || null,
      canonicalPath,
      redirectTo: canonicalPath !== pathname ? canonicalPath : null,
    };
  }

  for (const section of ARTICLE_SECTIONS) {
    const article = pathname.match(
      new RegExp(`^${section.basePath}/([^/]+)/?$`)
    );
    if (!article) continue;

    const slug = decodeURIComponent(article[1]);
    const found = readArticles(section).find((a) => a.slug === slug);

    if (found) {
      // Истата адреса секогаш, независно од тоа како дошло барањето —
      // слагот во базата е веќе точен облик, нема голема/мала буква да се
      // нормализира.
      const canonicalPath = `${section.basePath}/${encodeURIComponent(found.slug)}`;

      return {
        title: `${found.title} | Display.mk`,
        description: excerptFor(found.excerpt || DEFAULT_META.description),
        found: true,
        kind: "article",
        article: found,
        section,
        image: found.hasImage ? found.image : null,
        canonicalPath,
        redirectTo: canonicalPath !== pathname ? canonicalPath : null,
      };
    }

    return { ...DEFAULT_META, found: false, kind: "article", canonicalPath: pathname };
  }

  // Непознат пат, но постои во App.js (нов route некој ден) — 200, општ опис,
  // наместо 404. Само /tv/ и /novosti/ смеат вистински да „не постојат".
  return { ...DEFAULT_META, found: true, kind: "static", canonicalPath: pathname };
}

/*
  Статија преместена во друг дел.

  Петте текстови за технологии се преселија од /novosti/ во /edu/, а нивните
  стари адреси се веќе споделени. Наместо 404, тие водат таму каде што
  статијата сега живее — и правилото важи за секое идно преселување, зашто се
  гледа каде слагот навистина е.

  An article that moved to the other section. The five technology pieces moved
  from /novosti/ to /edu/, and their old addresses are already out there. They
  lead to where the article now lives rather than 404ing, and the rule holds
  for any future move, because it looks up where the slug actually is.
*/
function movedTo(pathname) {
  for (const section of ARTICLE_SECTIONS) {
    const article = pathname.match(
      new RegExp(`^${section.basePath}/([^/]+)/?$`)
    );
    if (!article) continue;

    const slug = decodeURIComponent(article[1]);

    // Still where it was: nothing to do.
    if (readArticles(section).some((a) => a.slug === slug)) return null;

    for (const other of ARTICLE_SECTIONS) {
      if (other === section) continue;

      if (readArticles(other).some((a) => a.slug === slug)) {
        return `${other.basePath}/${encodeURIComponent(slug)}`;
      }
    }
  }

  return null;
}

// Слика за споделување кога страницата нема своја (1200×630, генерирана со
// scripts/makeOgImage.js) — icon-512.png останува само лого за Organization.
const DEFAULT_SHARE_IMAGE = `${SITE}/og-image.png`;
const DEFAULT_SHARE_IMAGE_ALT = "Display.mk — најди го твојот телевизор";

function absoluteImage(imgPath) {
  if (!imgPath) return null;
  if (/^https?:\/\//.test(imgPath)) return imgPath;
  return `${SITE}${imgPath.startsWith("/") ? "" : "/"}${imgPath}`;
}

const ldEscape = (json) => json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

function ldScript(obj) {
  return `<script type="application/ld+json">${ldEscape(JSON.stringify(obj))}</script>`;
}

/*
  JSON-LD само за Home, ТВ страница и статија — единствените три каде што
  има вистински, проверливи податоци да се опишат. Само стварни вредности;
  никогаш offers/price/review/rating (телевизорот нема наша цена/оценка).
*/
function jsonLdFor(meta) {
  if (meta.kind === "home") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Display.mk",
        url: SITE,
        inLanguage: "mk",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Display.mk",
        url: SITE,
        logo: `${SITE}/icon-512.png`,
      },
    ];
  }

  if (meta.kind === "tv" && meta.tv) {
    const row = meta.tv;

    const additionalProperty = [
      row.size ? { "@type": "PropertyValue", name: "Големина", value: `${row.size}"` } : null,
      row.technology ? { "@type": "PropertyValue", name: "Технологија", value: row.technology } : null,
      row.resolution ? { "@type": "PropertyValue", name: "Резолуција", value: row.resolution } : null,
      row.refreshRate ? { "@type": "PropertyValue", name: "Освежување", value: `${row.refreshRate}Hz` } : null,
      row.hdr ? { "@type": "PropertyValue", name: "HDR", value: "Да" } : null,
    ].filter(Boolean);

    const brand = displayBrand(row.brand);

    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${brand} ${row.model}`,
      brand: { "@type": "Brand", name: brand },
      model: row.model,
      category: "Телевизори",
    };
    if (row.image) product.image = absoluteImage(row.image);
    if (additionalProperty.length) product.additionalProperty = additionalProperty;

    // Брендот нема своја страница на сајтот (нема /tv/:brand листинг), па
    // нема да измислувам адреса што не постои — чекорот за бренд е изоставен
    // наместо да му недостасува "item", а Google тоа го флагира.
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Почетна", item: SITE },
        { "@type": "ListItem", position: 2, name: `${brand} ${row.model}`, item: `${SITE}${meta.canonicalPath}` },
      ],
    };

    return [product, breadcrumb];
  }

  if (meta.kind === "article" && meta.article) {
    const a = meta.article;
    const sectionName = meta.section.name === "novosti" ? "Новости" : "Еду";

    const article = {
      "@context": "https://schema.org",
      // Новости = вистинска новинска содржина; Еду = траен, неизвесен по
      // датум текст — затоа различни типови наместо истиот за сите.
      "@type": meta.section.name === "novosti" ? "NewsArticle" : "Article",
      headline: a.title,
      description: excerptFor(a.excerpt),
      inLanguage: "mk",
      publisher: {
        "@type": "Organization",
        name: "Display.mk",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
      },
      author: a.author
        ? { "@type": "Person", name: a.author }
        : { "@type": "Organization", name: "Display.mk", url: SITE },
    };
    if (a.date) article.datePublished = a.date;
    if (a.hasImage && a.image) article.image = absoluteImage(a.image);

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Почетна", item: SITE },
        { "@type": "ListItem", position: 2, name: sectionName, item: `${SITE}${meta.section.basePath}` },
        { "@type": "ListItem", position: 3, name: a.title },
      ],
    };

    return [article, breadcrumb];
  }

  return [];
}

app.get("/__html/*", async (request, reply) => {
  /*
    НЕ request.params["*"] — Fastify го декодира целиот wildcard наеднаш, па
    %2F (екодирана косинка кај 14 Philips модели, пр. "43PFS6808/12") се
    претвора во вистинска „/" ПРЕД regex-ot во metaForPath да стигне до неа,
    па патот наеднаш има 3 делови наместо 2 и бара не се совпаѓа со телевизор
    воопшто. request.raw.url е непроменет, како што стигнал — секој дел се
    декодира одделно подолу, исто како /api/tvs/:brand/:model.
  */
  const pathname = (request.raw.url || "/").split("?")[0].replace(/^\/__html/, "") || "/";

  // Преместена статија: 301 кон новата адреса, пред било што друго.
  const moved = movedTo(pathname);
  if (moved) return reply.redirect(moved, 301);

  const meta = metaForPath(pathname);

  // Нестандардна форма на постоечки телевизор/статија (голема буква, без
  // enkodiranje): 301 кон единствената канонична адреса, само кога
  // навистина постои.
  if (meta.redirectTo) return reply.redirect(meta.redirectTo, 301);

  let html;
  try {
    html = fs.readFileSync(INDEX_HTML, "utf8");
  } catch {
    return reply.code(500).send("index.html недостапен");
  }

  // Во атрибут мора и наводникот; во текстот на <title> не треба и само
  // го прави изворот нечитлив („55&quot;" наместо 55").
  const escAttr = (v) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const escText = (v) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const url = `${SITE}${meta.canonicalPath || pathname}`;
  const ogType = meta.kind === "article" ? "article" : "website";
  const image = absoluteImage(meta.image) || DEFAULT_SHARE_IMAGE;
  const hasRealImage = Boolean(absoluteImage(meta.image));

  let headExtra =
    `<link rel="canonical" href="${escAttr(url)}"/>` +
    `<meta property="og:type" content="${ogType}"/>` +
    `<meta property="og:site_name" content="Display.mk"/>` +
    `<meta property="og:locale" content="mk_MK"/>` +
    `<meta property="og:title" content="${escAttr(meta.title)}"/>` +
    `<meta property="og:description" content="${escAttr(meta.description)}"/>` +
    `<meta property="og:url" content="${escAttr(url)}"/>` +
    `<meta property="og:image" content="${escAttr(image)}"/>` +
    (hasRealImage
      ? `<meta property="og:image:alt" content="${escAttr(meta.title)}"/>`
      : `<meta property="og:image:width" content="1200"/>` +
        `<meta property="og:image:height" content="630"/>` +
        `<meta property="og:image:alt" content="${escAttr(DEFAULT_SHARE_IMAGE_ALT)}"/>`) +
    `<meta name="twitter:card" content="summary_large_image"/>` +
    (meta.noindex ? `<meta name="robots" content="noindex, nofollow"/>` : "");

  if (meta.kind === "article" && meta.article) {
    if (meta.article.date) {
      headExtra += `<meta property="article:published_time" content="${escAttr(meta.article.date)}"/>`;
    }
    if (meta.article.category) {
      headExtra += `<meta property="article:section" content="${escAttr(meta.article.category)}"/>`;
    }
  }

  for (const block of jsonLdFor(meta)) {
    headExtra += ldScript(block);
  }

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escText(meta.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escAttr(meta.description)}"/>`
    )
    .replace("</head>", `${headExtra}</head>`);

  reply.header("Content-Type", "text/html; charset=utf-8");
  reply.header("Cache-Control", "no-cache, must-revalidate");

  // Непостоечки телевизор или статија: 404, за да не се индексираат
  // измислени адреси како вистински страници.
  if (!meta.found) reply.code(404);

  return html;
});

// Опциите за квизот: брендови со доволно модели, и буџетски опсези
// извадени од вистинската распределба на цени.
app.get("/api/quiz-options", async () => ({
  brands: quizBrands,
  budgets: quizBudgets,
  catalogueSize: quizCatalogue.length,
}));

app.post(
  "/api/recommend",
  {
    // Секое барање оценува 530 телевизори, па е поскапо од останатите.
    config: { rateLimit: { max: 20, timeWindow: "1 minute", keyGenerator: clientIp } },
  },
  async (request, reply) => {
  const answers = request.body || {};

  if (typeof answers !== "object" || Array.isArray(answers)) {
    return reply.code(400).send({ error: "Неисправни одговори" });
  }

  // Само полињата што квизот ги поставува — ништо друго не се проследува.
  const safe = {
    distance: typeof answers.distance === "string" ? answers.distance : null,
    light: typeof answers.light === "string" ? answers.light : null,
    use: typeof answers.use === "string" ? answers.use : null,
    priority: typeof answers.priority === "string" ? answers.priority : null,
    budget:
      answers.budget && typeof answers.budget === "object"
        ? {
            id: String(answers.budget.id ?? ""),
            min: Number(answers.budget.min) || 0,
            max: Number(answers.budget.max) || Number.MAX_SAFE_INTEGER,
          }
        : null,
    brands: Array.isArray(answers.brands)
      ? answers.brands.filter((b) => typeof b === "string").slice(0, 25)
      : [],

    // Желби за гејминг, не филтри — види коментарот во recommend.js.
    gamingWishes:
      answers.gamingWishes && typeof answers.gamingWishes === "object"
        ? {
            hz120: answers.gamingWishes.hz120 === true,
            vrr: answers.gamingWishes.vrr === true,
            allm: answers.gamingWishes.allm === true,
          }
        : {},
  };

  const result = recommend(quizCatalogue, safe, {
    extra: Number(answers.extra) || 0,
    sort: typeof answers.sort === "string" ? answers.sort : "match",
  });

  // Се враќаат само тројцата избрани, не целиот каталог.
  const shape = (pick) => ({
    kind: pick.kind,
    reasons: pick.reasons,
    warnings: pick.warnings,
    advantage: pick.advantage ?? null,
    tradeoff: pick.tradeoff ?? null,
    gaps: pick.gaps ?? [],
    tv: pick.tv,
  });

  return {
    picks: result.picks.map(shape),
    more: (result.more || []).map(shape),
    moreAvailable: result.moreAvailable ?? 0,
    blocked: result.blocked,
    relax: result.relax,
      consideredCount: result.consideredCount,
      brandNote: result.brandNote ?? null,
    };
  }
);

app.listen({ port: PORT, host: HOST }).then(() => {
  console.log(`API на http://${HOST}:${PORT}`);
});
