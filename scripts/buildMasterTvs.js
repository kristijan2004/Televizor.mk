const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../src/data");

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
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeBrand(value) {
  return String(value || "")
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
  /(\d{2,3})ELU/i,
  /\bH(\d{2,3})[A-Z]/i,
  /\bLT-(\d{2,3})[A-Z]/i,
  /\b(?:QE|UE|HG|MRE|OE)(\d{2,3})/i,
  /\bK(\d{2,3})[A-Z]/i,
  /\bST-(\d{2,3})[A-Z]/i,
  /\bQ(\d{2,3})[A-Z]/i,
  /\bTV(\d{2,3})[A-Z]/i
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
    gSync: old.gSync ?? false
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
 * Store definitions.
 */
const sources = [
  ["Anhoch", anhoch],
  ["Setec", setec],
  ["Neptun", neptun],
  ["DDStore", normalizedDDStore]
];

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
  if (!tv.brand || !tv.model) continue;

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
  image: cleanUrl(old?.image) || null,

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

         image: cleanUrl(old?.image) || null,

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
    if (!item.image && tv.image) {
  item.image = cleanUrl(tv.image);
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
  "Saved to: src/data/masterTvs.json"
);