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
  const sizeMatch = rest.match(/\s+(\d{2})"(?:\s|$)/);

  let model = modelMatch[1].trim();

  // Xiaomi S Mini LED: size is part of the model identity
  if (
    brand.toUpperCase() === "XIAOMI" &&
    model.toUpperCase() === "S MINI LED" &&
    sizeMatch
  ) {
    model = `${model} ${sizeMatch[1]}`;
  }

  return {
    brand,
    model
  };
}

  // Ako nema golemina vo toj format, zemi go prviot del
  const fallback = rest.split(
    /\s+(?:DLED|QLED|OLED|LED|FHD|UHD|4K|Smart)\b/i
  )[0];

  return {
    brand,
    model: fallback.trim()
  };
}

async function downloadImage(imageUrl, filename, imageDir) {
  if (!imageUrl) return null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer":
            "https://www.anhoch.com/categories/Televisions/products"
        }
      });

      if (response.ok) {
        const buffer = Buffer.from(
          await response.arrayBuffer()
        );

        const filePath = path.join(
          imageDir,
          filename
        );

        fs.writeFileSync(filePath, buffer);

        // Small pause before the next image
        await new Promise(resolve => setTimeout(resolve, 1200));

        return `/images/tvs/anhoch/${filename}`;
      }

      if (response.status === 429) {
        const wait = attempt * 3000;

        console.log(
          `   ⏳ Image 429, retrying in ${wait / 1000}s...`
        );

        await new Promise(resolve =>
          setTimeout(resolve, wait)
        );

        continue;
      }

      console.log(
        `   ⚠️ Image ${response.status}: ${imageUrl}`
      );

      return null;
    } catch (error) {
      console.log(
        `   ⚠️ Image error: ${imageUrl}`
      );

      return null;
    }
  }

  console.log(
    `   ❌ Image failed after retries: ${imageUrl}`
  );

  return null;
}

async function scrapeAnhoch() {
  console.log("🔎 Go proveruvam Anhoch...");

  const allTvs = [];

  const imageDir = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "tvs",
    "anhoch"
  );

  fs.mkdirSync(imageDir, {
    recursive: true
  });

  for (let page = 1; page <= 4; page++) {
    console.log(`📄 Strana ${page}/4...`);

    const response = await fetch(
      BASE_URL + page,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*",
          "X-Requested-With": "XMLHttpRequest",
          "Referer":
            "https://www.anhoch.com/categories/Televisions/products"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Anhoch vrati HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const products =
      data.products?.data || [];

    console.log(
      `   Najdeni: ${products.length}`
    );

    for (const product of products) {
      const { brand, model } =
        extractBrandModel(product.name);

      const originalImage =
        product.base_image?.path || null;

      const safeFilename =
        (
          product.slug ||
          `${brand}-${model}`
        )
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .toLowerCase() + ".jpg";

      const localImage =
        await downloadImage(
          originalImage,
          safeFilename,
          imageDir
        );

      allTvs.push({
        brand,
        model,
        name: product.name,
        slug: product.slug,
        price: Number(
          product.price?.amount || 0
        ),
        inStock:
          product.in_stock === true,
        image: localImage,
        store: "Anhoch",
        scrapedAt:
          new Date().toISOString()
      });
    }
  }

  // Dedupe po slug
  const uniqueTvs = Array.from(
    new Map(
      allTvs.map(tv => [
        tv.slug,
        tv
      ])
    ).values()
  );

  const outputDir = path.join(
    __dirname,
    "..",
    "src",
    "data"
  );

  const outputFile = path.join(
    outputDir,
    "anhochTvs.json"
  );

  fs.mkdirSync(outputDir, {
    recursive: true
  });

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      uniqueTvs,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    `✅ Najdeni se ${uniqueTvs.length} TV proizvodi.`
  );

  console.log(
    `💾 Zapisano vo: ${outputFile}`
  );

  console.log(
    `🖼️ Sliki zapisani vo: ${imageDir}`
  );
}

scrapeAnhoch().catch(error => {
  console.error(
    "❌ Scraperot ne uspea:"
  );
  console.error(error);
  process.exit(1);
});