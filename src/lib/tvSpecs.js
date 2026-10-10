/*
  Нормализиран каталог на телевизори за „Одбери ТВ".
  A normalised TV catalogue for the "Одбери ТВ" quiz.

  Pure data, no React.

  Why this module exists
  ----------------------
  masterTvs.json carries the deduplicated models and the per-retailer prices,
  but several of its spec columns are currently filled with one repeated
  default (`technology: "LED"` for every row, `resolution: "4K"` for every row,
  and so on). Treating those as facts would make the quiz confidently wrong.

  So every spec is resolved from the best source available, in order:

    1. the field on the master record — but only if that column actually
       varies across the catalogue (see `isColumnUsable`),
    2. the matching retailer record, which is joined through the store keys
       master already stores (97% of models join this way),
    3. the retailer's product name or slug, parsed,
    4. unknown — and unknown is kept as `null`, never guessed.

  Step 1 is what makes this self-correcting: as the master data gets filled in
  with real values, those columns start varying, this module starts trusting
  them, and the parsing below quietly stops being used.

  Every resolved value records where it came from, so the quiz can explain a
  recommendation from facts and stay silent about everything else.
*/

/*
  Нема `import masterTvs from ...` намерно. Додека го имаше, целата база
  (514 телевизори) завршуваше во JS bundle-от на секој посетител — токму тоа
  што се обидуваме да го тргнеме. Сега податоците се подаваат:
  серверот ги чита од SQLite и ги предава на buildCatalogue().
*/

/* ------------------------------------------------------------------ *
 * Column trust
 * ------------------------------------------------------------------ */

/*
  A column is usable when its values actually differ between TVs. One value
  repeated across the whole catalogue is a default that was never filled in,
  not a fact about 562 televisions.
*/
const DOMINANCE_LIMIT = 0.98;

function isColumnUsable(rows, field) {
  const counts = new Map();

  let filled = 0;

  for (const row of rows) {
    const value = row[field];

    if (value === null || value === undefined || value === "" || value === "—") {
      continue;
    }

    filled += 1;

    counts.set(value, (counts.get(value) || 0) + 1);
  }

  // Too small a sample to judge — take the data at face value.
  if (filled < 20) {
    return filled > 0;
  }

  if (counts.size < 2) {
    return false;
  }

  const biggest = Math.max(...counts.values());

  return biggest / filled < DOMINANCE_LIMIT;
}

/*
  TVs with `specsSource` (e.g. "icecat") have verified specs and are always
  trusted. The other TVs still hold the build script's placeholder defaults,
  so their spec fields are not trusted — except `size`, which the build
  script parses from the product name. A handful of hand-entered rows is
  enough variety to fool the column check, so it is only used for size.
*/
let usableColumn = {};
let cachedSource = null;
let cachedCatalogue = null;

function trusts(master, field) {
  return Boolean(master.specsSource) || Boolean(usableColumn[field]);
}

/* ------------------------------------------------------------------ *
 * Joining master records to the retailer records
 * ------------------------------------------------------------------ */

let anhochBySlug = new Map();
let setecByHandle = new Map();
let neptunByUrl = new Map();
let ddstoreByUrl = new Map();

/*
  Мора да се повика еднаш пред buildCatalogue().

  Порано сите овие се градеа при вчитување на модулот, од пет JSON датотеки
  внесени директно — што значеше дека ~800 KB податоци одат во bundle-от на
  секој посетител. Сега податоците ги подава тој што ги има: серверот ги чита
  од диск, тестот исто.
*/
export function loadData({
  masterTvs,
  anhochTvs = [],
  setecTvs = [],
  neptunTvs = [],
  ddstoreTvs = [],
}) {
  if (!Array.isArray(masterTvs)) {
    throw new TypeError("loadData: masterTvs мора да биде низа");
  }

  // Телевизорите без specsSource сè уште ги носат почетните вредности на
  // скриптата, па колоната се проверува само врз нив.
  usableColumn = {
    size: isColumnUsable(
      masterTvs.filter((tv) => !tv.specsSource),
      "size"
    ),
  };

  anhochBySlug = new Map(anhochTvs.map((tv) => [tv.slug, tv]));
  setecByHandle = new Map(setecTvs.map((tv) => [tv.handle, tv]));
  neptunByUrl = new Map(neptunTvs.map((tv) => [tv.url, tv]));
  ddstoreByUrl = new Map(ddstoreTvs.map((tv) => [tv.url, tv]));

  // Влезот се смени — кешот од buildCatalogue повеќе не важи.
  cachedSource = null;
  cachedCatalogue = null;
}

function retailerRecordsFor(stores) {
  const records = [];

  if (!stores) {
    return records;
  }

  const push = (record) => {
    if (record) {
      records.push(record);
    }
  };

  if (stores.Anhoch) {
    push(anhochBySlug.get(stores.Anhoch.url));
  }

  if (stores.Setec) {
    push(
      setecByHandle.get(stores.Setec.handle) ||
        setecByHandle.get(stores.Setec.url)
    );
  }

  if (stores.Neptun) {
    push(neptunByUrl.get(stores.Neptun.url));
  }

  if (stores.DDStore) {
    push(ddstoreByUrl.get(stores.DDStore.url));
  }

  return records;
}

/* ------------------------------------------------------------------ *
 * Parsing specs out of product names
 * ------------------------------------------------------------------ */

/*
  Ordered longest-first: "Neo QLED" and "QD-Mini LED" must win over the bare
  "QLED" and "LED" they contain.
*/
const TECHNOLOGY_PATTERNS = [
  [/QD[\s-]?MINI[\s-]?LED/i, "MINI_LED"],
  [/SQD[\s-]?MINI/i, "MINI_LED"],
  [/MINI[\s-]?LED/i, "MINI_LED"],
  [/MICRO[\s-]?RGB/i, "MICRO_RGB"],
  [/NEO[\s-]?QLED/i, "MINI_LED"],
  [/NANO[\s-]?CELL/i, "NANOCELL"],
  [/\bQNED\b/i, "QNED"],
  [/\bOLED\b/i, "OLED"],
  [/\bQLED\b/i, "QLED"],
  [/\bD?LED\b/i, "LED"],
  [/\bLCD\b/i, "LED"],
];

const RESOLUTION_PATTERNS = [
  [/\b8K\b/i, "8K"],
  [/\b(4K|UHD)\b/i, "4K"],
  [/\b(FHD|FULL\s*HD|1080P)\b/i, "FHD"],
  [/\b(HD\s*READY|HDREADY|720P)\b/i, "HD"],
];

function matchPattern(patterns, text) {
  if (!text) {
    return null;
  }

  for (const [pattern, value] of patterns) {
    if (pattern.test(text)) {
      return value;
    }
  }

  return null;
}

// Human-facing labels. Technology keys stay stable; these are what users read.
export const TECHNOLOGY_LABELS = {
  OLED: "OLED",
  MINI_LED: "Mini LED",
  MICRO_RGB: "Micro RGB",
  QNED: "QNED",
  NANOCELL: "NanoCell",
  QLED: "QLED",
  LED: "LED",
};

/*
  How well each panel type copes with a bright room, and how good its blacks
  are in a dark one. Used for the room-light question, and deliberately coarse
  — these are tendencies of the technology, not measurements of a model.
*/
export const TECHNOLOGY_TRAITS = {
  OLED: { bright: 1, dark: 5, premium: true },
  MICRO_RGB: { bright: 5, dark: 4, premium: true },
  MINI_LED: { bright: 5, dark: 4, premium: true },
  QNED: { bright: 4, dark: 3, premium: false },
  NANOCELL: { bright: 3, dark: 2, premium: false },
  QLED: { bright: 4, dark: 3, premium: false },
  LED: { bright: 2, dark: 2, premium: false },
};

/* ------------------------------------------------------------------ *
 * Per-spec resolution
 * ------------------------------------------------------------------ */

function resolveSize(master, records, text) {
  if (trusts(master, "size") && master.size > 0) {
    return { value: master.size, source: "master" };
  }

  const fromRetailer = records.find((record) => record.size > 0);

  if (fromRetailer) {
    return { value: fromRetailer.size, source: "retailer" };
  }

  // `55"` or `55 inch` in the product name.
  const inches = text.match(/\b(\d{2,3})\s*(?:"|''|inch|инчи)/i);

  if (inches) {
    return { value: Number(inches[1]), source: "name" };
  }

  if (master.size > 0) {
    return { value: master.size, source: "master" };
  }

  return { value: null, source: null };
}

function resolveTechnology(master, records, text) {
  if (trusts(master, "technology") && master.technology) {
    const normalised = matchPattern(TECHNOLOGY_PATTERNS, master.technology);

    if (normalised) {
      return { value: normalised, source: "master" };
    }
  }

  // Setec publishes a real panel-type field; prefer it over any parsing.
  const fromRetailer = records.find((record) => record.technology);

  if (fromRetailer) {
    const normalised = matchPattern(
      TECHNOLOGY_PATTERNS,
      fromRetailer.technology
    );

    if (normalised) {
      return { value: normalised, source: "retailer" };
    }
  }

  const parsed = matchPattern(TECHNOLOGY_PATTERNS, text);

  if (parsed) {
    return { value: parsed, source: "name" };
  }

  return { value: null, source: null };
}

function resolveResolution(master, records, text) {
  if (trusts(master, "resolution") && master.resolution) {
    const normalised = matchPattern(RESOLUTION_PATTERNS, master.resolution);

    if (normalised) {
      return { value: normalised, source: "master" };
    }
  }

  const fromRetailer = records.find((record) => record.resolution);

  if (fromRetailer) {
    const normalised = matchPattern(
      RESOLUTION_PATTERNS,
      fromRetailer.resolution
    );

    if (normalised) {
      return { value: normalised, source: "retailer" };
    }
  }

  const parsed = matchPattern(RESOLUTION_PATTERNS, text);

  if (parsed) {
    return { value: parsed, source: "name" };
  }

  return { value: null, source: null };
}

function resolveRefreshRate(master, records, text) {
  if (trusts(master, "refreshRate") && master.refreshRate > 0) {
    return { value: master.refreshRate, source: "master" };
  }

  const fromRetailer = records.find((record) => record.refreshRate > 0);

  if (fromRetailer) {
    return { value: fromRetailer.refreshRate, source: "retailer" };
  }

  const hertz = text.match(/\b(\d{2,3})\s*Hz\b/i);

  if (hertz) {
    return { value: Number(hertz[1]), source: "name" };
  }

  return { value: null, source: null };
}

function resolveOs(master, records) {
  if (trusts(master, "os") && master.os) {
    return { value: master.os, source: "master" };
  }

  const fromRetailer = records.find((record) => record.os);

  if (fromRetailer) {
    return { value: fromRetailer.os, source: "retailer" };
  }

  return { value: null, source: null };
}

/*
  Gaming is the thinnest part of the catalogue: HDMI 2.1, VRR and ALLM are not
  recorded anywhere yet, and a refresh rate is known for only a small share of
  models. Rather than inferring "this is a gaming TV" from the series name,
  this returns only what is actually known, and `known: false` otherwise. The
  quiz then says so instead of making a claim.
*/
function resolveGaming(master, records, text, refreshRate) {
  const flag = (field) => {
    if (trusts(master, field) && master[field] === true) {
      return true;
    }

    return records.some((record) => record[field] === true);
  };

  const vrr = flag("vrr") || /\bVRR\b/i.test(text);
  const allm = flag("allm") || /\bALLM\b/i.test(text);
  const hdmi21 = /HDMI\s*2\.1/i.test(text);

  const highRefresh = refreshRate.value !== null && refreshRate.value >= 120;

  const known = refreshRate.value !== null || vrr || allm || hdmi21;

  return { vrr, allm, hdmi21, highRefresh, known };
}

/* ------------------------------------------------------------------ *
 * Prices and store links
 * ------------------------------------------------------------------ */

function storeUrlFor(storeName, store) {
  if (!store) {
    return null;
  }

  if (storeName === "Anhoch" && store.url) {
    return `https://www.anhoch.com/products/${store.url}`;
  }

  if (storeName === "Setec" && (store.handle || store.url)) {
    return `https://setec.mk/products/${store.handle || store.url}`;
  }

  if (storeName === "Neptun" && store.url) {
    return `https://www.neptun.mk/categories/${store.url.replace(
      "https://www.neptun.mk/",
      ""
    )}`;
  }

  if (storeName === "DDStore" && store.url) {
    return store.url;
  }

  return null;
}

function buildOffers(stores) {
  return Object.entries(stores || {})
    .map(([name, store]) => ({
      store: name,
      price: typeof store?.price === "number" ? store.price : null,
      regularPrice:
        typeof store?.regularPrice === "number" ? store.regularPrice : null,
      inStock: store?.inStock === true,
      url: storeUrlFor(name, store),
    }))
    .filter((offer) => offer.price !== null)
    .sort((a, b) => a.price - b.price);
}

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */

function buildEntry(master) {
  const records = retailerRecordsFor(master.stores);

  // Everything the retailers wrote about this model, for the parsers to read.
  const text = records
    .map((record) => [record.name, record.slug].filter(Boolean).join(" "))
    .join(" ");

  const size = resolveSize(master, records, text);
  const technology = resolveTechnology(master, records, text);
  const resolution = resolveResolution(master, records, text);
  const refreshRate = resolveRefreshRate(master, records, text);
  const os = resolveOs(master, records);
  const gaming = resolveGaming(master, records, text, refreshRate);

  const offers = buildOffers(master.stores);

  const inStockOffers = offers.filter((offer) => offer.inStock);

  // The in-stock price is what the user can act on; fall back to any price so
  // a model is not dropped just because stock flags are missing.
  const priced = inStockOffers.length > 0 ? inStockOffers : offers;

  return {
    id: master.id,
    brand: master.brand,
    model: master.model,
    image: master.image,

    size: size.value,
    technology: technology.value,
    resolution: resolution.value,
    refreshRate: refreshRate.value,
    os: os.value,
    gaming,

    // Where each value came from: "master" | "retailer" | "name" | null.
    // The quiz only makes a claim about a spec that is not null.
    sources: {
      size: size.source,
      technology: technology.source,
      resolution: resolution.source,
      refreshRate: refreshRate.source,
      os: os.source,
    },

    offers,
    price: priced.length > 0 ? priced[0].price : null,
    inStock: inStockOffers.length > 0,
    storeCount: offers.length,
  };
}

/*
  `rows` се записите како во masterTvs.json (истиот облик што го враќа
  SQLite преку API-то). Резултатот се кешира по идентитет на влезот, па
  повеќе повици со истата низа не ја градат листата одново.
*/
export function buildCatalogue(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("buildCatalogue: потребна е низа телевизори");
  }

  if (cachedSource !== rows) {
    cachedSource = rows;
    cachedCatalogue = rows.map(buildEntry);
  }

  return cachedCatalogue;
}

/* ------------------------------------------------------------------ *
 * Options the quiz offers, derived from the catalogue itself
 * ------------------------------------------------------------------ */

/*
  Brands worth offering as a filter: enough models behind each one that picking
  it does not empty the results.
*/
export function getBrandOptions(catalogue, minimumModels = 5) {
  const counts = new Map();

  for (const tv of catalogue) {
    if (!tv.brand || tv.price === null) {
      continue;
    }

    counts.set(tv.brand, (counts.get(tv.brand) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minimumModels)
    .sort((a, b) => b[1] - a[1])
    .map(([brand, count]) => ({ brand, count }));
}

/*
  Budget brackets taken from the real price distribution rather than invented
  round numbers, so each bracket actually has stock behind it.
*/
export function getBudgetOptions(catalogue) {
  const prices = catalogue
    .map((tv) => tv.price)
    .filter((price) => price !== null)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return [];
  }

  const quantile = (fraction) =>
    prices[Math.min(prices.length - 1, Math.floor(prices.length * fraction))];

  // Rounded to a readable number, then kept in ascending order.
  const round = (value) => Math.round(value / 1000) * 1000;

  const cuts = [...new Set([0.25, 0.5, 0.75].map((f) => round(quantile(f))))];

  const options = [];

  let previous = 0;

  for (const cut of cuts) {
    options.push({
      id: `do-${cut}`,
      label: `До ${formatNumber(cut)} ден.`,
      min: previous,
      max: cut,
    });

    previous = cut;
  }

  options.push({
    id: `nad-${previous}`,
    label: `Над ${formatNumber(previous)} ден.`,
    min: previous,
    max: Infinity,
  });

  options.push({
    id: "bez-ogranicuvanje",
    label: "Без ограничување",
    min: 0,
    max: Infinity,
  });

  return options;
}

/*
  Македонски запис на илјадници: точка, не запирка.

  Macedonian writes thousands with a dot (31.300), which is what the rest of
  the site's copy uses. `toLocaleString("mk-MK")` renders a comma in Chrome, so
  the separator is applied here instead of relying on the locale data.
*/
export function formatNumber(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(price) {
  if (typeof price !== "number") {
    return "—";
  }

  return `${formatNumber(price)} ден.`;
}

// Panel type as a person would write it, e.g. MINI_LED -> "Mini LED".
export function technologyLabel(technology) {
  if (!technology) {
    return null;
  }

  return TECHNOLOGY_LABELS[technology] || technology;
}
