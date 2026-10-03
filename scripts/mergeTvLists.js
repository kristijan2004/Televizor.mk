import fs from "fs";
import path from "path";

const DATA_DIR = "./src/data";

const files = [
  {
    store: "Anhoch",
    candidates: ["anhochTvs.json", "anhoch-models.json"],
  },
  {
    store: "Setec",
    candidates: ["setecTvs.json", "setec-tvs.json", "setec-models.json"],
  },
  {
    store: "Neptun",
    candidates: ["neptunTvs.json", "neptun-tvs.json", "neptun-models.json"],
  },
  {
    store: "DDStore",
    candidates: ["ddstore-models.json", "ddstoreTvs.json"],
  },
];

function findFile(candidates) {
  for (const file of candidates) {
    const full = path.join(DATA_DIR, file);

    if (fs.existsSync(full)) {
      return full;
    }
  }

  return null;
}

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanImageUrl(value) {
  if (!value) return null;

  const text = String(value).trim();

  const markdownMatch = text.match(
    /^\[(https?:\/\/.+?)\]\(https?:\/\/.+?\)$/
  );

  if (markdownMatch) {
    return markdownMatch[1];
  }

  return text;
}

function normalizeBrand(brand) {
  const b = clean(brand).toUpperCase();

  const map = {
    PHILIPS: "PHILIPS",
    SAMSUNG: "SAMSUNG",
    SONY: "SONY",
    LG: "LG",
    HISENSE: "HISENSE",
    TCL: "TCL",
    VIVAX: "VIVAX",
    XIAOMI: "XIAOMI",
    AIWA: "AIWA",
    HAIER: "HAIER",
    TESLA: "TESLA",
    METZ: "METZ",
    BAUTECH: "BAUTECH",
    ST: "ST",
    TELEFUNKEN: "TELEFUNKEN",
    BEKO: "BEKO",
    FUEGO: "FUEGO",
    NEO: "NEO",
    PANASONIC: "PANASONIC",
    GRUNDIG: "GRUNDIG",
    SHARP: "SHARP",
    JVC: "JVC",
  };

  return map[b] || b;
}

function normalizeModel(model) {
  let m = clean(model)
    .toUpperCase()
    .replace(/[Хх]/g, "X")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, "");

  const brands = [
    "SAMSUNG",
    "LG",
    "SONY",
    "PHILIPS",
    "HISENSE",
    "TCL",
    "VIVAX",
    "XIAOMI",
    "AIWA",
    "HAIER",
    "TESLA",
    "METZ",
    "BAUTECH",
    "TELEFUNKEN",
    "BEKO",
    "FUEGO",
    "NEO",
    "PANASONIC",
    "GRUNDIG",
    "SHARP",
    "JVC",
  ];

  for (const brand of brands) {
    if (m.startsWith(brand)) {
      m = m.slice(brand.length);
      break;
    }
  }

  const aliases = {
    A43U: "ELA6018GL",
  };

  return aliases[m] || m;
}

function removeDuplicateBrandFromModel(brand, model) {
  const b = clean(brand).toUpperCase();
  let m = clean(model);

  if (m.toUpperCase().startsWith(b + " ")) {
    m = m.slice(b.length).trim();
  }

  return m;
}

/*
 * Clean models coming specifically from Neptun.
 *
 * Important:
 * We use product.name/model only for Neptun-style
 * extraction. Existing exact models from Anhoch,
 * Setec and DDStore are not aggressively rewritten.
 */
function cleanNeptunModel(brand, model, name) {
  const source = clean(name || model);

  if (!source) {
    return model;
  }

  /*
   * FUEGO
   */

  if (brand === "FUEGO") {
    let match;

    // 65 CH944 GTV
    match = source.match(/\b(\d{2,3})\s+(CH944\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 55 CH844 GTV
    match = source.match(/\b(\d{2,3})\s+(CH844\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 32/40/43 MC 720 VDTV
    match = source.match(/\b(\d{2})\s+(MC\s+720\s+VDTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 32 MTC 720 GTV
    match = source.match(/\b(\d{2})\s+(MTC\s+720\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 100 ELU 820 GTV
    match = source.match(/\b(\d{2,3})\s+(ELU\s+820\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 55 ELU 820 GTV
    match = source.match(/\b(\d{2,3})\s+(ELU\s+820\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }

    // 43/50/55/65/75/85 ELU 720 GTV
    match = source.match(/\b(\d{2})\s+(ELU\s+720\s+GTV)\b/i);
    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }
  }

  /*
   * BEKO
   */

  if (brand === "BEKO") {
    const match = source.match(
      /\b(\d{2})\s+(BHU|BCQ)\s+(\d{4})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}`;
    }
  }

  /*
   * HISENSE
   */

  if (brand === "HISENSE") {
    const match = source.match(
      /\b(\d{2,3})\s+(A4S|A6S|A6Q|E7S\s+PRO|U7SE)\b/i
    );

    if (match) {
      return `${match[1]}${match[2].replace(/\s+/g, "")}`;
    }
  }

  /*
   * LG
   *
   * Examples:
   * 55 QNED 70A6A -> 55QNED70A6A
   * 65 NANO 81A6A -> 65NANO81A6A
   * 55 C51 LA -> 55C51LA
   * 43 UA 75003 LA -> 43UA75003LA
   */

  if (brand === "LG") {
    let match;

    match = source.match(
      /\b(\d{2,3})\s+(QNED)\s+([A-Z0-9]+)\s*([A-Z0-9]*)\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(NANO)\s+([A-Z0-9]+)\s*([A-Z0-9]*)\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(OLED)\s*([A-Z0-9]+)\s*([A-Z0-9]*)\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(UA)\s+([0-9]+)\s+([A-Z]{2})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(NU)\s+([0-9]+)\s+([A-Z]{2,3})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(LQ)\s+([0-9]+)\s+([A-Z]{2})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(C|B|G)\s+([0-9]+)\s+([A-Z]{2})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }

    match = source.match(
      /\b(\d{2,3})\s+(B62?|C51|C61)\s+([A-Z]{2})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}`;
    }
  }

  /*
   * SAMSUNG
   *
   * Examples:
   * QE 55 QN70H AUXXH -> QE55QN70HAUXXH
   * UE 55 M70H AUXXH -> UE55M70HAUXXH
   * QE 65 QN90F ATXXH -> QE65QN90FATXXH
   */

  if (brand === "SAMSUNG") {
    let match;

    match = source.match(
      /\b(QE|UE|MRE)\s+(\d{2,3})\s+([A-Z0-9]+)\s+([A-Z0-9]+)\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}`;
    }
  }

  /*
   * TCL
   *
   * Examples:
   * 55 C69K -> 55C69K
   * 65 P89L 144Hz -> 65P89L
   */

  if (brand === "TCL") {
    const match = source.match(
      /\b(\d{2,3})\s+([A-Z]\d{1,3}[A-Z]?)\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}`;
    }
  }

  /*
   * PHILIPS
   */

  if (brand === "PHILIPS") {
    const match = source.match(
      /\b(\d{2,3})\s+(PFS|PUS)\s+(\d{4})\b/i
    );

    if (match) {
      return `${match[1]}${match[2]}${match[3]}`;
    }
  }

  return model;
}

function getMasterModel(brand, model) {
  const b = clean(brand).toUpperCase();
  const m = clean(model).toUpperCase();

  if (b === "XIAOMI") {
    const aliases = {
      A43U: "ELA6018GL",
    };

    return aliases[m] || model;
  }

  return model;
}

function extractProduct(product, store) {
  let brand = clean(product.brand);
  let model = clean(product.model);

  /*
   * If the source already has brand + model,
   * keep it.
   */
  if (brand && model) {
    model = removeDuplicateBrandFromModel(brand, model);

    /*
     * Only clean model formatting for Neptun.
     */
    if (store === "Neptun") {
      model = cleanNeptunModel(
        normalizeBrand(brand),
        model,
        product.name
      );
    }

    model = getMasterModel(brand, model);
  }

  /*
   * Fallback extraction from product name.
   */
  if ((!brand || !model) && product.name) {
    const name = clean(product.name);
    let match;

    match = name.match(
      /^PHILIPS\s+([A-Z0-9]+(?:\/\d+)?)/i
    );

    if (match) {
      brand = "PHILIPS";
      model = match[1];
    }

    match = name.match(
      /^BAUTECH\s+([A-Z0-9-]+)/i
    );

    if (match) {
      brand = "BAUTECH";
      model = match[1];
    }

    match = name.match(
      /^(ST-[A-Z0-9-]+)/i
    );

    if (match) {
      brand = "ST";
      model = match[1];
    }

    match = name.match(
      /^HAIER\s+([A-Z0-9]+)/i
    );

    if (match) {
      brand = "HAIER";
      model = match[1];
    }

    match = name.match(
      /^TESLA\s+TV\s+([A-Z0-9]+)/i
    );

    if (match) {
      brand = "TESLA";
      model = match[1];
    }

    match = name.match(
      /^TV\s+AIWA\s+\d{2}"\s+([A-Z0-9]+)/i
    );

    if (match) {
      brand = "AIWA";
      model = match[1];
    }

    match = name.match(
      /^TV\s+VIVAX\s+\d{2}"\s+(TV-[A-Z0-9-]+)/i
    );

    if (match) {
      brand = "VIVAX";
      model = match[1];
    }

    match = name.match(
      /\b(ELA\d+[A-Z]+)\b/i
    );

    if (match) {
      brand = "XIAOMI";
      model = match[1];
    }

    match = name.match(
      /\b(\d{2}MQF[A-Z0-9]+)\b/i
    );

    if (match) {
      brand = "METZ";
      model = match[1];
    }

    if (!brand) {
      match = name.match(
        /^(?:TV\s+)?([A-Za-z]+)\s+/i
      );

      if (match) {
        brand = match[1];

        const rest = name.slice(match[0].length);

        const code = rest.match(
          /\b([A-Z]{0,4}\d{2,}[A-Z0-9/-]*)\b/i
        );

        if (code) {
          model = code[1];
        }
      }
    }
  }

  if (!brand || !model) {
    return null;
  }

  brand = normalizeBrand(brand);

  /*
   * Again apply Neptun cleanup after fallback extraction.
   */
  if (store === "Neptun") {
    model = cleanNeptunModel(
      brand,
      model,
      product.name
    );
  }

  model = removeDuplicateBrandFromModel(
    brand,
    model
  );

  model = getMasterModel(
    brand,
    model
  );

  return {
    brand,
    model: clean(model),
    image: cleanImageUrl(product.image),
    key:
      brand +
      "|" +
      normalizeModel(model),
  };
}

/*
 * Load all store files.
 */

const allProducts = [];

for (const entry of files) {
  const file = findFile(entry.candidates);

  if (!file) {
    console.log(
      `⚠️ ${entry.store}: file not found`
    );
    continue;
  }

  console.log(
    `Loading ${entry.store}: ${file}`
  );

  const data = JSON.parse(
    fs.readFileSync(file, "utf8")
  );

  for (const product of data) {
    allProducts.push({
      ...product,
      _store: entry.store,
    });
  }
}

/*
 * Build master list.
 */

const masterMap = new Map();

for (const product of allProducts) {
  const extracted = extractProduct(
    product,
    product._store
  );

  if (!extracted) {
    continue;
  }

  const existing = masterMap.get(
    extracted.key
  );

  if (!existing) {
    masterMap.set(
      extracted.key,
      {
        brand: extracted.brand,
        model: extracted.model,
        stores: [product._store],
        image: extracted.image,
      }
    );

    continue;
  }

  if (
    !existing.stores.includes(
      product._store
    )
  ) {
    existing.stores.push(
      product._store
    );
  }

  if (
    !existing.image &&
    extracted.image
  ) {
    existing.image = extracted.image;
  }
}

/*
 * Sort.
 */

const master = Array.from(
  masterMap.values()
).sort((a, b) => {
  const brandCompare =
    a.brand.localeCompare(b.brand);

  if (brandCompare !== 0) {
    return brandCompare;
  }

  return a.model.localeCompare(
    b.model
  );
});

/*
 * Save.
 */

fs.writeFileSync(
  path.join(
    DATA_DIR,
    "master-tvs.json"
  ),
  JSON.stringify(
    master,
    null,
    2
  )
);

/*
 * Statistics.
 */

const totalProducts =
  allProducts.length;

const totalUnique =
  master.length;

const withImages =
  master.filter(
    (tv) => tv.image
  ).length;

const withoutImages =
  master.filter(
    (tv) => !tv.image
  ).length;

const duplicates =
  totalProducts -
  totalUnique;

console.log("");
console.log(
  "================================="
);
console.log(
  "MASTER TV LIST"
);
console.log(
  "================================="
);
console.log(
  `Products from stores: ${totalProducts}`
);
console.log(
  `Unique TV models:     ${totalUnique}`
);
console.log(
  `Duplicates merged:    ${duplicates}`
);
console.log(
  `With images:          ${withImages}`
);
console.log(
  `Without images:       ${withoutImages}`
);
console.log(
  "================================="
);
console.log("");
console.log(
  "Saved to: src/data/master-tvs.json"
);