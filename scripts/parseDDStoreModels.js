import fs from "fs";

const INPUT = "./src/data/ddstoreTvs.json";
const OUTPUT = "./src/data/ddstore-models.json";

function extractBrandModel(name) {
  let text = name
    .replace(/\s+/g, " ")
    .trim();

  // PHILIPS 43PFS6808/12
  // PHILIPS 50PUS7409/12
  // PHILIPS 75MLED950/12
  // PHILIPS 65PQS8501/12
  let match = text.match(
    /^PHILIPS\s+([A-Z0-9]+(?:\/\d+)?)/i
  );

  if (match) {
    return {
      brand: "Philips",
      model: match[1]
    };
  }

  // BAUTECH 32BHR45, ...
  // BAUTECH 43BFH80, ...
  match = text.match(
    /^BAUTECH\s+([A-Z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "BAUTECH",
      model: match[1]
    };
  }

  // ST-65DQ8000
  // ST-50DX7800
  // ST-32DH4300
  match = text.match(
    /^(ST-[A-Z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "ST",
      model: match[1]
    };
  }

  // Vivax 32" TV-32LE117T2S2
  match = text.match(
    /^TV\s+Vivax\s+\d{2}"\s+(TV-[A-Z0-9-]+)/i
  );

  if (match) {
    return {
      brand: "Vivax",
      model: match[1]
    };
  }

  // Tesla TV Q40E665GFS
  // Tesla TV 32E655BHS
  // Tesla TV 40E655BFS
  // Tesla TV 55E655BUS
  // Tesla TV Q43E665GFS
  match = text.match(
    /^Tesla\s+TV\s+([A-Z0-9]+)/i
  );

  if (match) {
    return {
      brand: "Tesla",
      model: match[1]
    };
  }

  // Aiwa
  // TV Aiwa 50" 50N21 ...
  // TV Aiwa 55" 55N27 ...
  match = text.match(
    /^TV\s+Aiwa\s+\d{2}"\s+([A-Z0-9]+)/i
  );

  if (match) {
    return {
      brand: "Aiwa",
      model: match[1]
    };
  }

  // Haier H43Q80FUX, ...
  // Haier H65K85FUX, ...
  // Haier H43S80GUX, ...
  match = text.match(
    /^Haier\s+([A-Z0-9]+)/i
  );

  if (match) {
    return {
      brand: "Haier",
      model: match[1]
    };
  }

  // Metz ... 50MQF7500Z
  match = text.match(
    /\b(METZ)\b.*?\b(\d{2}[A-Z0-9]+)\b/i
  );

  if (match) {
    return {
      brand: "Metz",
      model: match[2]
    };
  }

  // Xiaomi:
  // 55 inch 55E7S ...
  // TV A Pro 32" 2026 (ELA5950GL)
  // TV S Mini LED 65" 2026 (ELA6470GL)
  // TV A 43U 2026 (ELA6018GL)
  // Xiaomi TV A 55"2026 (ELA5918GL)
    // Xiaomi 55E7S
  match = text.match(
    /^55\s+inch\s+(55E7S)\b/i
  );

  if (match) {
    return {
      brand: "Xiaomi",
      model: match[1]
    };
  }

  if (/ELA5950GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA5950GL"
    };
  }

  if (/ELA6470GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA6470GL"
    };
  }

  if (/ELA6488GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA6488GL"
    };
  }

  if (/ELA6018GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA6018GL"
    };
  }

  if (/ELA6452GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA6452GL"
    };
  }

  if (/ELA5918GL/i.test(text)) {
    return {
      brand: "Xiaomi",
      model: "ELA5918GL"
    };
  }

  // Unknown - don't invent a model
  return {
    brand: "",
    model: ""
  };
}

const products = JSON.parse(
  fs.readFileSync(INPUT, "utf8")
);

const result = products.map(product => {
  const parsed = extractBrandModel(product.name);

  return {
    brand: parsed.brand,
    model: parsed.model,
    name: product.name
  };
});

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(result, null, 2)
);

console.log(`DDStore products: ${products.length}`);
console.log(`Parsed models: ${result.filter(x => x.brand && x.model).length}`);

const unknown = result.filter(
  x => !x.brand || !x.model
);

if (unknown.length) {
  console.log(`\nUNKNOWN: ${unknown.length}`);

  unknown.forEach(x => {
    console.log(`- ${x.name}`);
  });
}

console.log(`\nЗачувано во: ${OUTPUT}`);
