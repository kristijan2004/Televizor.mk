const fs = require("fs");
const path = require("path");

// Note: the folder is "Data" with a capital D (Linux is case-sensitive).
const dataDir = path.join(__dirname, "../src/Data");

function readJson(file) {
  const filePath = path.join(dataDir, file);

  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const combinedModels = readJson("master-tvs.json");

const anhoch = readJson("anhochTvs.json");
const setec = readJson("setecTvs.json");
const neptun = readJson("neptunTvs.json");
const ddstore = readJson("ddstoreTvs.json");

const masterPath = path.join(dataDir, "masterTvs.json");

let oldMaster = [];

if (fs.existsSync(masterPath)) {
  oldMaster = readJson("masterTvs.json");
}

/*
 * Normalize text for matching.
 *
 * Examples:
 *
 * 43QNED71B3B
 * LG 43 QNED 71B3B
 *
 * both become:
 * 43qned71b3b
 */
/*
 * Some retailer model numbers contain Cyrillic letters that look Latin,
 * e.g. Setec's "QE55Q8FAAUXХH" with a Cyrillic "Х". They are converted to
 * Latin so they match "QE55Q8FAAUXXH" from other stores.
 */
const CYRILLIC_LOOKALIKES = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O",
  Р: "P", С: "C", Т: "T", Х: "X", У: "Y",
  а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o",
  р: "p", с: "c", т: "t", х: "x", у: "y"
};

function toLatin(value) {
  return String(value || "").replace(
    /[АВЕКМНОРСТХУавекмнорстху]/g,
    char => CYRILLIC_LOOKALIKES[char]
  );
}

function normalizeText(value) {
  return toLatin(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeBrand(value) {
  return toLatin(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function key(brand, model) {
  return `${normalizeBrand(brand)}|${normalizeText(model)}`;
}

function slugify(brand, model) {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanUrl(value) {
  if (!value) return null;

  const text = String(value).trim();

  // Markdown link: [label](https://...)
  const markdownMatch = text.match(/\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) {
    return markdownMatch[1];
  }

  return text;
}

/*
 * Neptun and Anhoch block their images when they are shown on another
 * website, so direct links to them never load in the browser. Store images
 * that the scrapers downloaded (/images/tvs/...) and DDStore/Setec links work.
 */
function usableImage(value) {
  const url = cleanUrl(value);

  if (url && /^https?:\/\/(www\.)?(neptun\.mk|anhoch\.com)\//i.test(url)) {
    return null;
  }

  return url;
}

/*
 * Default specs for a brand-new TV.
 * These are only used when the model is first discovered.
 */
function extractSize(tv) {
  const text = [
    tv?.model,
    tv?.name,
    tv?.title
  ]
    .filter(Boolean)
    .join(" ");

  // Explicit sizes: 32", 43 inch, 55 inches
  const explicit = text.match(/(\d{2,3})\s*(?:["”″]|inch(?:es)?)/i);

  if (explicit) {
    const size = Number(explicit[1]);
    if (size >= 24 && size <= 120) return size;
  }

  // Common TV model formats
  const patterns = [
  /*
    TCL and similar write the size straight against the series letters —
    50S5L, 55C79L, 65RM7L, 85C89L. The standalone \b\d{2,3}\b fallback below
    never sees these, because there is no word boundary after the digits.
  */
  /\b(\d{2,3})(?:RM|QM|MQ|[CPSVXU])\d/i,
  /(\d{2,3})ELU/i,
  /\bH(\d{2,3})[A-Z]/i,
  /\bLT-(\d{2,3})[A-Z]/i,
  /\b(?:QE|UE|HG|MRE|OE)(\d{2,3})/i,
  /\bK(\d{2,3})[A-Z]/i,
  /\bST-(\d{2,3})[A-Z]/i,
  /\bQ(\d{2,3})[A-Z]/i,
  /\bTV(\d{2,3})[A-Z]/i,
  // Philips: 55OLED811, 55PUS9010, 65MLED920, 43PFS6000
  /\b(\d{2,3})(?:OLED|MLED|PUS|PFS|PHS|PML)\d/i
];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const size = Number(match[1]);

      if (size >= 24 && size <= 120) {
        return size;
      }
    }
  }

  // Standalone realistic TV sizes
  const matches = text.match(/\b\d{2,3}\b/g) || [];

  const validSizes = [
    24, 28, 32, 40, 42, 43, 48, 49, 50, 55,
    58, 60, 65, 70, 75, 77, 83, 85, 86, 98,
    100, 105, 110, 115
  ];

  for (const value of matches) {
    const size = Number(value);

    if (validSizes.includes(size)) {
      return size;
    }
  }

  return 0;
}
function defaultSpecs() {
  return {
    size: 0,
    technology: "LED",
    resolution: "4K",
    refreshRate: 60,
    year: 2026,
    os: "Smart TV",
    hdr: false,
    dolbyVision: false,
    hdmi: 0,
    usb: 0,
    vrr: false,
    allm: false,
    pictureProcessor: "—",
    hdrFormats: [],
    brightness: "—",
    audioPower: 0,
    audioChannels: "2.0",
    dolbyAtmos: false,
    freeSync: false,
    gSync: false
  };
}

/*
 * Preserve manually entered specs.
 */
function getSpecs(old) {
  if (!old) {
    return defaultSpecs();
  }

  return {
    size: old.size || 0,
    technology: old.technology ?? "LED",
    resolution: old.resolution ?? "4K",
    refreshRate: old.refreshRate ?? 60,
    year: old.year ?? 2026,
    os: old.os ?? "Smart TV",
    hdr: old.hdr ?? false,
    dolbyVision: old.dolbyVision ?? false,
    hdmi: old.hdmi ?? 0,
    usb: old.usb ?? 0,
    vrr: old.vrr ?? false,
    allm: old.allm ?? false,
    pictureProcessor: old.pictureProcessor ?? "—",
    hdrFormats: old.hdrFormats ?? [],
    brightness: old.brightness ?? "—",
    audioPower: old.audioPower ?? 0,
    audioChannels: old.audioChannels ?? "2.0",
    dolbyAtmos: old.dolbyAtmos ?? false,
    freeSync: old.freeSync ?? false,
    gSync: old.gSync ?? false,
    // Where verified specs came from (e.g. "icecat"). Missing = placeholders.
    ...(old.specsSource ? { specsSource: old.specsSource } : {})
  };
}

/*
 * Extract DDStore identity.
 */
function parseDDStore(tv) {
  if (!tv || !tv.name) return null;

  const name = String(tv.name).trim();

  /*
   * Vivax
   * TV Vivax 32" TV-32LE117T2S2 ...
   */
  let match = name.match(
    /^TV\s+Vivax\s+\d+["”']?\s+([A-Za-z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "VIVAX",
      model: match[1]
    };
  }

  /*
   * Aiwa
   * TV Aiwa 50" 50N21 ...
   */
  match = name.match(
    /^TV\s+Aiwa\s+\d+["”']?\s+([A-Za-z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "AIWA",
      model: match[1]
    };
  }

  /*
   * Tesla
   * Tesla TV Q40E665GFS,GoogleQLED
   * Tesla TV 32E655BHS 32"
   */
  match = name.match(
    /^Tesla\s+TV\s+([A-Za-z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "TESLA",
      model: match[1]
    };
  }

  /*
   * Xiaomi without the brand in the name
   * TV S Mini LED 65" 2026 (ELA6470GL)
   * (ELA... is Xiaomi's product code)
   */
  match = name.match(
    /^TV\s.*\((ELA[A-Za-z0-9-]+)\)\s*$/i
  );

  if (match) {
    return {
      brand: "XIAOMI",
      model: match[1]
    };
  }

  /*
   * Metz sold under "CE"
   * CE TV LED SMART 50" METZ TV, QLED UHD, ..., 50MQF7500Z
   */
  match = name.match(
    /METZ.*\b(\d{2}M[A-Z0-9]{4,})\b/i
  );

  if (match) {
    return {
      brand: "METZ",
      model: match[1]
    };
  }

  /*
   * Xiaomi
   * Xiaomi TV A 55"2026 (ELA5918GL)
   */
  match = name.match(
    /^Xiaomi.*?\(([A-Za-z0-9-]+)\)/i
  );

  if (match) {
    return {
      brand: "XIAOMI",
      model: match[1]
    };
  }

  /*
   * Generic "BRAND MODEL, description"
   */
  const firstPart = name.split(",")[0].trim();

  match = firstPart.match(/^([A-Za-z]+)\s+(.+)$/);

  if (match) {
    return {
      brand: match[1].toUpperCase(),
      model: match[2].trim()
    };
  }

  /*
   * Models such as ST-65DQ8000
   */
  match = firstPart.match(
    /^([A-Za-z]+-\d+[A-Za-z0-9-]*)/
  );

  if (match) {
    const model = match[1];

    return {
      brand: model.split("-")[0].toUpperCase(),
      model
    };
  }

  return null;
}

/*
 * Convert all DDStore products to brand/model format.
 */
const normalizedDDStore = ddstore
  .map(tv => {
    const parsed = parseDDStore(tv);

    if (!parsed) return null;

    return {
      ...tv,
      brand: parsed.brand,
      model: parsed.model
    };
  })
  .filter(Boolean);

/*
 * Anhoch sometimes stores only the product line as the model,
 * e.g. "Imago" for "TV Vivax Imago LED TV40LE115T2S2".
 * When the model has no digits, take the model number from the name.
 */
/*
 * Anhoch also uses series names without the screen size, e.g.
 * "TV Sony 55" Bravia 6 A65 Oled Google" → model "Bravia 6 A65" for both
 * the 55" and the 65" TV. Those are matched by size + series code to a
 * model in master-tvs.json ("K55A65PB.CEI"), so each size stays separate.
 */
function findBySizeAndSeries(tv) {
  const size = String(tv.name || "").match(/\b(\d{2,3})\s*["”]/)?.[1];
  const series = String(tv.model || "").trim().split(/\s+/).pop();

  // The series code must contain letters and digits ("A65", "XR70").
  if (!size || !/[a-z]/i.test(series) || !/\d/.test(series)) return null;

  const wanted = normalizeText(size + series);
  const brand = normalizeBrand(tv.brand);

  const candidates = combinedModels.filter(
    model =>
      normalizeBrand(model.brand) === brand &&
      normalizeText(model.model).includes(wanted)
  );

  // Only use an unambiguous match.
  return candidates.length === 1 ? candidates[0].model : null;
}

const normalizedAnhoch = anhoch.map(tv => {
  if (!tv.model || !tv.name) return tv;

  // Model without a screen size: "Bravia 6 A65" (but not "UE43DU7172")
  if (!/^\D*\d{2,3}/.test(tv.model)) {
    const model = findBySizeAndSeries(tv);
    if (model) return { ...tv, model };
  }

  if (/\d/.test(tv.model)) return tv;

  const match = String(tv.name).match(/\b([A-Z]{0,3}-?\d{2}[A-Z0-9-]{4,})\b/i);

  return match ? { ...tv, model: match[1] } : tv;
});

/*
 * Store TV categories sometimes include projectors, e.g. Setec lists the
 * Samsung Freestyle (SP-LFF3CLAXXH) and The Premiere (SP-LSP3BLAXXH).
 * They are not TVs, so they are skipped.
 */
function isProjector(tv) {
  const text = `${tv.model || ""} ${tv.name || ""}`;

  return (
    // Setec writes the model as "SAMSUNG SP-LSP3BLAXXH"
    (/samsung/i.test(tv.brand || "") && /(^|\s)SP-?L[A-Z0-9]/i.test(String(tv.model || "").trim())) ||
    /projector|проектор/i.test(text)
  );
}

/*
 * Store definitions.
 */
const sources = [
  ["Anhoch", normalizedAnhoch],
  ["Setec", setec],
  ["Neptun", neptun],
  ["DDStore", normalizedDDStore]
].map(([store, list]) => [store, list.filter(tv => !isProjector(tv))]);

/*
 * Existing master map.
 */
const oldMap = new Map();

for (const tv of oldMaster) {
  if (!tv.brand || !tv.model) continue;

  oldMap.set(
    key(tv.brand, tv.model),
    tv
  );
}

/*
 * Canonical model list.
 *
 * Start with the 519 models from master-tvs.json.
 */
const canonical = [];

for (const tv of combinedModels) {
  if (!tv.brand || !tv.model || isProjector(tv)) continue;

  canonical.push({
    brand: String(tv.brand).trim(),
    model: String(tv.model).trim()
  });
}

/*
 * Find a canonical model inside a store product.
 *
 * This handles cases such as:
 *
 * MASTER:
 * LG | 43QNED71B3B
 *
 * NEPTUN:
 * LG | LG 43 QNED 71B3B
 *
 * and:
 *
 * MASTER:
 * PHILIPS | 32PHS6050
 *
 * DDSTORE:
 * PHILIPS 32PHS6050/12
 */
function findCanonicalMatch(brand, model) {
  const brandNorm = normalizeBrand(brand);
  let text = normalizeText(model);

  if (text.startsWith(brandNorm)) {
    text = text.slice(brandNorm.length);
  }

  const sizeMatch = text.match(/^(?:qe|qn|qned|oled|ue|un|kq|kd|xr)?(\d{2,3})(?=[a-z])/i);
  const modelSize = sizeMatch?.[1] || "";

  let best = null;
  let bestLength = 0;

  for (const candidate of canonical) {
    if (normalizeBrand(candidate.brand) !== brandNorm) {
      continue;
    }

    const candidateModel = normalizeText(candidate.model);
    if (!candidateModel) continue;

    const candidateSizeMatch = candidateModel.match(
      /^(?:qe|qn|qned|oled|ue|un|kq|kd|xr)?(\d{2,3})(?=[a-z])/i
    );

    const candidateSize = candidateSizeMatch?.[1] || "";

    if (
      modelSize &&
      candidateSize &&
      modelSize !== candidateSize
    ) {
      continue;
    }

    if (text === candidateModel) {
      return candidate;
    }

    if (
      text.includes(candidateModel) &&
      candidateModel.length > bestLength
    ) {
      best = candidate;
      bestLength = candidateModel.length;
    }
  }

  return best;
}
/*
 * Convert a store product into a canonical identity.
 */
function getIdentity(tv, store) {
  if (!tv) return null;

  let brand = tv.brand;
  let model = tv.model;

  /*
   * DDStore has already been normalized above.
   */
  if (!brand || !model) return null;

  brand = String(brand).trim().toUpperCase();
  model = String(model).trim();

  /*
   * Try to match the existing canonical model.
   */
  const canonicalMatch = findCanonicalMatch(
    brand,
    model
  );

  if (canonicalMatch) {
    return {
      brand: canonicalMatch.brand,
      model: canonicalMatch.model,
      canonical: true
    };
  }

  /*
   * No canonical match.
   * This is a genuinely new model.
   */
  return {
    brand,
    model,
    canonical: false
  };
}

/*
 * Store-specific data.
 *
 * Only this part changes when prices/stocks change.
 */
function storeData(tv, store) {
  if (!tv) return null;

  const data = {
    price: tv.price ?? null,
    regularPrice: tv.regularPrice ?? null,
    inStock: tv.inStock ?? null,
    image: cleanUrl(tv.image)
  };

  if (store === "Anhoch") {
    data.url = tv.url || tv.slug || null;
  }

  if (store === "Setec") {
    data.handle = tv.handle || null;
  }

  if (store === "Neptun") {
    data.url = cleanUrl(tv.url);
  }

  if (store === "DDStore") {
    data.url = cleanUrl(tv.url);
  }

  return data;
}

/*
 * Build store maps using canonical identities.
 */
const sourceMaps = {};

for (const [store, list] of sources) {
  sourceMaps[store] = new Map();

  for (const tv of list) {
    const identity = getIdentity(tv, store);

    if (!identity) continue;

    const k = key(
      identity.brand,
      identity.model
    );

    sourceMaps[store].set(k, tv);
  }
}

/*
 * Build the final master.
 *
 * Start with canonical models.
 */
const masterMap = new Map();

for (const combined of canonical) {
  const k = key(
    combined.brand,
    combined.model
  );

  const old = oldMap.get(k);

  masterMap.set(k, {
    id:
      old?.id ||
      slugify(
        combined.brand,
        combined.model
      ),

    brand: combined.brand,
    model: combined.model,

    /*
     * Existing manual specs survive.
     */
    ...getSpecs(old),

    /*
     * Preserve manually selected image.
     */
  image: usableImage(old?.image) || null,

    stores: {}
  });
}

/*
 * Add store products.
 *
 * If a store has a model that wasn't in the original
 * 519-model list, add it as a new master TV.
 */
for (const [store, list] of sources) {
  for (const tv of list) {
    const identity = getIdentity(tv, store);

    if (!identity) continue;

    const k = key(
      identity.brand,
      identity.model
    );

    let item = masterMap.get(k);

    if (!item) {
      const old = oldMap.get(k);

      item = {
        id:
          old?.id ||
          slugify(
            identity.brand,
            identity.model
          ),

        brand: identity.brand,
        model: identity.model,

        /*
         * New models receive defaults.
         * You can manually fill these later.
         */
        ...getSpecs(old),

         image: usableImage(old?.image) || null,

        stores: {}
      };

      masterMap.set(k, item);
    }

    /*
     * Update only this store's information.
     */
    item.stores[store] = storeData(
      tv,
      store
    );
    if (!item.size || item.size === 0) {
  const extractedSize = extractSize(tv);

  if (extractedSize) {
    item.size = extractedSize;
  }
}

    /*
     * If there is no manually selected master image,
     * use the first available store image.
     */
    if (!item.image && usableImage(tv.image)) {
  item.image = usableImage(tv.image);
}
  }
}

/*
 * Convert map to array.
 */
const master = Array.from(
  masterMap.values()
);

/*
 * Sort by brand and model.
 */
master.sort((a, b) => {
  const brandCompare =
    a.brand.localeCompare(b.brand);

  if (brandCompare !== 0) {
    return brandCompare;
  }

  return a.model.localeCompare(b.model);
});

/*
 * Чистење пред запишување.
 *
 * Автоматски најдените телевизори доаѓаат со името како што го пишува
 * трговецот, па знае да биде „TCL TCL 50S5L" или моделот да го нема
 * препознаено бројот на инчи. Двете се поправаат тука, по градењето,
 * за да не се менува логиката на секој трговец поединечно.
 */
let fixedBrand = 0;
let fixedSize = 0;

for (const tv of master) {
  if (tv.brand && tv.model) {
    // „TCL TCL 50S5L" -> „TCL 50S5L"; „SAMSUNG Samsung QE55" -> „SAMSUNG QE55"
    const stripped = tv.model.replace(
      new RegExp(`^\\s*${tv.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"),
      ""
    ).trim();

    if (stripped && stripped !== tv.model) {
      tv.model = stripped;
      fixedBrand += 1;
    }
  }

  if (!tv.size) {
    const retry = extractSize({ model: tv.model, name: `${tv.brand} ${tv.model}` });
    if (retry) {
      tv.size = retry;
      fixedSize += 1;
    }
  }
}

/*
  Трговците знаат да го стават целото рекламно име како модел
  („65 Q7S, 4K Ultra HD, 8ms"). Моделите немаат запирки, па сè по првата
  запирка е маркетинг и се отсекува.
*/
let fixedName = 0;

for (const tv of master) {
  if (tv.model && tv.model.includes(",")) {
    const short = tv.model.split(",")[0].trim();
    if (short.length >= 3) {
      tv.model = short;
      fixedName += 1;
    }
  }
}

/*
  Технологијата се погодува од името САМО кај телевизори без specsSource —
  тие ја носат стандардната „LED" од defaultSpecs(), што е погрешно за
  QNED/OLED/QLED моделите. Проверените не се допираат.
*/
let fixedTech = 0;

/*
  Без \b на крајот: моделите пишуваат QNED8M, QNED81, OLED55 — по буквите
  веднаш доаѓа цифра, па \b никогаш не се совпаѓа. Редоследот е важен:
  „Neo QLED" пред „QLED", инаку второто го фаќа првото.
*/
const TECH_FROM_NAME = [
  [/NEO\s?QLED/i, "Neo QLED"],
  [/MINI\s?LED|\bMLED/i, "Mini LED"],
  [/NANO\s?CELL|\bNANO\d/i, "NanoCell"],
  [/QNED/i, "QNED"],
  [/OLED/i, "OLED"],
  [/QLED/i, "QLED"],
];

for (const tv of master) {
  if (tv.specsSource) continue;

  const text = `${tv.brand} ${tv.model}`;

  for (const [pattern, label] of TECH_FROM_NAME) {
    if (pattern.test(text)) {
      if (tv.technology !== label) {
        tv.technology = label;
        fixedTech += 1;
      }
      break;
    }
  }
}

if (fixedName || fixedTech) {
  console.log(`Исчистени: ${fixedName} имиња од реклама, ${fixedTech} технологии од името`);
}

if (fixedBrand || fixedSize) {
  console.log(`Исчистени: ${fixedBrand} модели со дуплиран бренд, ${fixedSize} најдени големини`);
}

/*
 * Save.
 */
fs.writeFileSync(
  masterPath,
  JSON.stringify(master, null, 2),
  "utf8"
);

/*
 * Statistics.
 */
console.log(
  `Original canonical models: ${combinedModels.length}`
);

console.log(
  `Final Master TVs: ${master.length}`
);

for (const [store] of sources) {
  const count = master.filter(
    tv => tv.stores[store]
  ).length;

  console.log(
    `${store}: ${count}`
  );
}

console.log("");

console.log(
  `New models added: ${master.length - combinedModels.length}`
);

console.log("");

console.log(
  `Saved to: ${masterPath}`
);