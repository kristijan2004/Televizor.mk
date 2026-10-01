import fs from "fs";
import { execSync } from "child_process";
import * as cheerio from "cheerio";

const CURL_TEMPLATE = "/tmp/ddstore-curl.sh";
const OUTPUT = "./src/data/ddstoreTvs.json";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function decodeResponse(raw) {
  let text = raw.trim();

  // Response-от е JSON string / escaped HTML.
  // Пробај прво како JSON.
  try {
    const parsed = JSON.parse(text);

    if (typeof parsed === "string") {
      return parsed;
    }

    // Ако е JSON object, побарај string што содржи product-item-link
    if (parsed && typeof parsed === "object") {
      for (const value of Object.values(parsed)) {
        if (typeof value === "string" && value.includes("product-item-link")) {
          return value;
        }
      }
    }
  } catch {
    // Не е чист JSON, продолжи со raw text.
  }

  // Ако останале escaped quotes
  return text
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&");
}

function getProductsFromHtml(raw) {
  const html = decodeResponse(raw);
  const $ = cheerio.load(html);

  const products = [];

  $("a.product-item-link").each((index, element) => {
    const link = $(element);

    const name = link
      .text()
      .replace(/\s+/g, " ")
      .trim();

    let url = link.attr("href") || "";

    if (!name || !url) return;

    if (url.startsWith("/")) {
      url = "https://ddstore.mk" + url;
    }

    const item = link.closest("li");

    const text = item
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const priceMatch = text.match(/([\d.]+)\s*ден/);
    const price = priceMatch
      ? Number(priceMatch[1].replace(/\./g, ""))
      : null;

    let regularPrice = null;

    const regularMatch = text.match(
      /Регуларна цена\s*([\d.]+)\s*ден/i
    );

    if (regularMatch) {
      regularPrice = Number(
        regularMatch[1].replace(/\./g, "")
      );
    }

    const img = item.find("img").first();

    let image =
      img.attr("src") ||
      img.attr("data-src") ||
      img.attr("data-original") ||
      null;

    if (image && image.startsWith("/")) {
      image = "https://ddstore.mk" + image;
    }

    let inStock = null;

    if (
      text.includes("1-3 дена") ||
      text.includes("Во ДДСтор магацин") ||
      text.includes("Последно парче")
    ) {
      inStock = true;
    } else if (
      text.includes("Прашај за залиха") ||
      text.includes("Нема залиха")
    ) {
      inStock = false;
    }

    products.push({
      name,
      price,
      regularPrice,
      inStock,
      image,
      url,
      store: "DDStore"
    });
  });

  return products;
}

async function scrape() {
  console.log("DDStore scraper");
  console.log("================");

  if (!fs.existsSync(CURL_TEMPLATE)) {
    console.log(`Не постои ${CURL_TEMPLATE}`);
    process.exit(1);
  }

  const allProducts = [];

  for (let page = 1; page <= 3; page++) {
    console.log(`\nСтрана ${page}...`);

    try {
      let command = fs.readFileSync(
        CURL_TEMPLATE,
        "utf8"
      );

      command = command.replace(
        /televisions\.html\?utm_source=chatgpt\.com&p=2/g,
        `televisions.html?utm_source=chatgpt.com&p=${page}`
      );

      const raw = execSync(command, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024
      });

      console.log(`  Response: ${raw.length} карактери`);

      const products = getProductsFromHtml(raw);

      console.log(`  Пронајдени: ${products.length}`);

      if (products.length > 0) {
        console.log(`  Прв: ${products[0].name}`);
      }

      allProducts.push(...products);

      await sleep(3000);

    } catch (error) {
      console.log(`  Грешка: ${error.message}`);
    }
  }

  const uniqueProducts = Array.from(
    new Map(
      allProducts.map(product => [
        product.url,
        product
      ])
    ).values()
  );

  console.log(
    `\nВкупно уникатни DDStore телевизори: ${uniqueProducts.length}`
  );

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(uniqueProducts, null, 2)
  );

  console.log(`Зачувано во: ${OUTPUT}`);
}

scrape();