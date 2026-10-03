const fs = require("fs");
const path = require("path");

const BASE_URL =
  "https://www.anhoch.com/products?query=&categories[0]=Televisions&tag=&fromPrice=0&toPrice=299980&inStockOnly=2&sort=latest&perPage=30&page=";
function extractBrandModel(name) {
  let text = name
    .replace(/^TV\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Poseben slucaj: TV 55" NEO 55UHD15F25...
  const sizeFirst = text.match(
    /^\d{2}"\s+([A-Za-z]+)\s+(.+?)(?:\s+\d{2}"|\s+QLED|\s+LED|\s+FULL HD|\s+FHD|\s+UHD|\s+4K|\s+Smart|$)/i
  );

  if (sizeFirst) {
    return {
      brand: sizeFirst[1],
      model: sizeFirst[2].trim()
    };
  }

  // Brandot e prviot zbor
  const brandMatch = text.match(/^([A-Za-z]+)\s+/);

  if (!brandMatch) {
    return {
      brand: "",
      model: text
    };
  }

  const brand = brandMatch[1];
  let rest = text.slice(brandMatch[0].length).trim();

  // Ako goleminata e vednas posle brandot, ja preskoknuvame.
  rest = rest.replace(/^\d{2}"\s+/, "");

  // Xiaomi TV A 55" -> modelot e TV A
  // Xiaomi A Pro 32" -> modelot e A Pro
  // Modelot e delot pred goleminata
  const modelMatch = rest.match(/^(.+?)(?=\s+\d{2}"(?:\s|$)|\s+\d{2}''(?:\s|$))/);

  if (modelMatch) {
    return {
      brand,
      model: modelMatch[1].trim()
    };
  }

  // Ako nema golemina vo toj format, zemi go prviot del
  const fallback = rest.split(/\s+(?:DLED|QLED|OLED|LED|FHD|UHD|4K|Smart)\b/i)[0];

  return {
    brand,
    model: fallback.trim()
  };
}

async function scrapeAnhoch() {
  console.log("🔎 Go proveruvam Anhoch...");

  const allTvs = [];

  for (let page = 1; page <= 4; page++) {
    console.log(`📄 Strana ${page}/4...`);

    const response = await fetch(BASE_URL + page, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer":
          "https://www.anhoch.com/categories/Televisions/products"
      }
    });

    if (!response.ok) {
      throw new Error(`Anhoch vrati HTTP ${response.status}`);
    }

    const data = await response.json();

    const products = data.products?.data || [];

    console.log(`   Najdeni: ${products.length}`);

    for (const product of products) {
 const { brand, model } = extractBrandModel(product.name);

allTvs.push({
  brand,
  model,
  name: product.name,
  slug: product.slug,
  price: Number(product.price?.amount || 0),
  inStock: product.in_stock === true,
  image: product.base_image?.path || null,
  store: "Anhoch",
  scrapedAt: new Date().toISOString()
});
     }
  }

  // Dedupe po slug
  const uniqueTvs = Array.from(
    new Map(allTvs.map(tv => [tv.slug, tv])).values()
  );

  const outputDir = path.join(__dirname, "..", "src", "data");
  const outputFile = path.join(outputDir, "anhochTvs.json");

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    outputFile,
    JSON.stringify(uniqueTvs, null, 2),
    "utf8"
  );

  console.log("");
  console.log(`✅ Najdeni se ${uniqueTvs.length} TV proizvodi.`);
  console.log(`💾 Zapisano vo: ${outputFile}`);
}

scrapeAnhoch().catch(error => {
  console.error("❌ Scraperot ne uspea:");
  console.error(error);
  process.exit(1);
});
