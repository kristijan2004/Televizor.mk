const fs = require("fs");

const BASE_URL =
  "https://www.anhoch.com/products?query=&categories[0]=Televisions&tag=&fromPrice=0&toPrice=299980&inStockOnly=2&sort=latest&perPage=30&page=";

async function getPage(page) {
  const response = await fetch(BASE_URL + page);

  if (!response.ok) {
    throw new Error(`Anhoch vrati HTTP ${response.status}`);
  }

  const data = await response.json();

  return data.products;
}

function extractBrandAndModel(name) {
  let clean = name
    .replace(/^TV\s+/i, "")
    .trim();

  const knownBrands = [
    "Samsung",
    "Sony",
    "LG",
    "Philips",
    "TCL",
    "Hisense",
    "Xiaomi",
    "JVC",
    "Aiwa",
    "NEO",
    "Thomson",
    "Vivax",
    "Telefunken",
    "Haier",
    "Panasonic",
    "Grundig",
    "Sharp"
  ];

  const brand = knownBrands.find(
    (b) => clean.toLowerCase().startsWith(b.toLowerCase() + " ")
  );

  if (!brand) {
    return null;
  }

  let model = clean.slice(brand.length).trim();

  // Go trgame prviot broj na ekranot, primer:
  // Samsung 43" UE43...
  // Sony 55" K55S35B
  // Aiwa 43" 43N21
  model = model.replace(/^\d{2,3}"\s*/i, "");

  // Kaj Samsung nekoi modeli imaat crticka:
  // UE-43CU7092UXXH -> UE43CU7092UXXH
  model = model.replace(/^UE-(\d)/i, "UE$1");

  // Kaj Sony:
  // KD-55X75WLPAEP ostanuva kako originalen model
  // K55S35B ostanuva kako originalen model

  // Stopiraj modelot pred opisot ako ima golemina
  // ili opis posle modelot.
  const match = model.match(
    /^([A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*)(?=\s|$)/
  );

  if (match) {
    model = match[1];
  }

  return {
    brand,
    model
  };
}

async function main() {
  const allProducts = [];

  for (let page = 1; page <= 4; page++) {
    console.log(`Anhoch: page ${page}/4...`);

    const products = await getPage(page);

    console.log(`  Found ${products.data.length} products`);

    allProducts.push(...products.data);
  }

  const tvs = [];

  for (const product of allProducts) {
    const result = extractBrandAndModel(product.name);

    if (result) {
      tvs.push(result);
    } else {
      console.log(`⚠️ Ne go prepoznavam: ${product.name}`);
    }
  }

  const unique = Array.from(
    new Map(
      tvs.map((tv) => [
        `${tv.brand.toLowerCase()}|${tv.model.toLowerCase()}`,
        tv
      ])
    ).values()
  );

  fs.writeFileSync(
    "anhoch-tvs.json",
    JSON.stringify(unique, null, 2),
    "utf8"
  );

  console.log("");
  console.log(`Anhoch proizvodi: ${allProducts.length}`);
  console.log(`Prepoznati TV modeli: ${tvs.length}`);
  console.log(`Unikatni modeli: ${unique.length}`);
  console.log("Zapisano vo: anhoch-tvs.json");
}

main().catch((error) => {
  console.error("❌ Scraperot ne uspea:");
  console.error(error.message);
  process.exit(1);
});
