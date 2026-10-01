import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL =
  "https://www.neptun.mk/NeptunCategories/LoadProductsForCategory";

const outputFile = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "neptunTvs.json"
);

const imageDir = path.join(
  __dirname,
  "..",
  "public",
  "images",
  "tvs",
  "neptun"
);

async function fetchPage(page) {
  const body = {
    model: {
      CategoryId: 173,
      Sort: 7,
      Manufacturers: [],
      Recomended: false,
      PriceRange: {
        MinPriceValue: 8999,
        MaxPriceValue: 309999,
      },
      BoolFeatures: [],
      DropdownFeatures: [],
      MultiSelectFeatures: [],
      ShowAllProducts: false,
      ItemsPerPage: 100,
      CurrentPage: page,
      TotalItems: 160,
    },
  };

  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json;charset=utf-8",
      "Referer": "https://www.neptun.mk/televizori.nspx?items=100",
      "FROM-ANGULAR": "true",
      "Origin": "https://www.neptun.mk",

      "Cookie":
        "ASP.NET_SessionId=n2zjzxh31bpg0sutdgeclajl; cart=471aff0c-684c-461c-bfe3-fe8ac70dc6f8; TawkConnectionTime=0; twk_idm_key=h9hUuTGiNhWCE5JmDi5Z9; categoryView=true",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Neptun HTTP ${response.status}`);
  }

  return response.json();
}

function makeFilename(product) {
  const base =
    product.Title ||
    `neptun-${product.Id}`;

  return (
    base
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() +
    "-" +
    product.Id +
    ".jpg"
  );
}

async function downloadImage(imageUrl, filename) {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0",
      },
    });

    if (!response.ok) {
      console.log(
        `   ⚠️ Image ${response.status}: ${imageUrl}`
      );
      return null;
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    fs.writeFileSync(
      path.join(imageDir, filename),
      buffer
    );

    // Small pause between image requests
    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    return `/images/tvs/neptun/${filename}`;
  } catch (error) {
    console.log(
      `   ⚠️ Image error: ${imageUrl}`
    );
    return null;
  }
}

async function parseProducts(data) {
  const products = data?.Batch?.Items || [];

  const result = [];

  for (const product of products) {
    const originalImage = product.Thumbnail
      ? `https://www.neptun.mk/${product.Thumbnail}`
      : null;

    const filename = makeFilename(product);

    const localImage = await downloadImage(
      originalImage,
      filename
    );

    result.push({
      id: product.Id,

      brand: product.Manufacturer?.Name || "",
      model: product.Title || "",
      name: product.Title || "",

      price:
        typeof product.ActualPrice === "number"
          ? product.ActualPrice
          : product.ActualPrice?.parsedValue ?? null,

      regularPrice:
        typeof product.RegularPrice === "number"
          ? product.RegularPrice
          : product.RegularPrice?.parsedValue ?? null,

      inStock:
        product.AvailableOnline === true ||
        product.AvailableWebshop === true,

      quantity: product.Quantity ?? null,

      image: localImage,

      url: product.Url
        ? `https://www.neptun.mk/${product.Url}`
        : null,

      barcode: product.Barcode || null,

      store: "Neptun",

      scrapedAt: new Date().toISOString(),
    });
  }

  return result;
}

async function main() {
  console.log("Ги земам Neptun телевизорите...");

  fs.mkdirSync(imageDir, {
    recursive: true,
  });

  const allProducts = [];

  for (const page of [1, 2]) {
    console.log(`Страна ${page}...`);

    const data = await fetchPage(page);
    const products = await parseProducts(data);

    console.log(`  Пронајдени: ${products.length}`);

    allProducts.push(...products);
  }

  const uniqueProducts = Array.from(
    new Map(
      allProducts.map((tv) => [tv.id, tv])
    ).values()
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(uniqueProducts, null, 2)
  );

  console.log("");
  console.log(
    `Готово: ${uniqueProducts.length} Neptun телевизори`
  );
  console.log(
    `Зачувано во: ${outputFile}`
  );
  console.log(
    `Слики: ${imageDir}`
  );
}

main().catch((error) => {
  console.error("Грешка:", error);
  process.exit(1);
});