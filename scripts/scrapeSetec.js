const fs = require("fs");

const URL = "https://search.sp.solslab.dev/indexes/products/search";

const FILTER =
  "product_categories.id = 'pcat_01JFZ1W9MH5JJWEP4XT0YSPGMH' AND status = 'published' AND is_web_active = 'true'";

async function getPage(page, token) {
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Origin: "https://www.setec.mk",
      Referer: "https://www.setec.mk/",
    },
    body: JSON.stringify({
      q: "",
      hitsPerPage: 20,
      page,
      filter: FILTER,
      sort: ["variants.calculated_price.calculated_amount:asc"],
      matchingStrategy: "all",
      facets: ["product_categories.id"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Setec API error: ${response.status}`);
  }

  return response.json();
}

function extractProducts(data) {
  if (Array.isArray(data.hits)) return data.hits;

  if (Array.isArray(data)) return data;

  const numericKeys = Object.keys(data)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));

  return numericKeys.map((key) => data[key]);
}

function cleanImageUrl(value) {
  if (!value) return null;

  const text = String(value).trim();

  // Setec sometimes returns:
  // [https://image.webp](https://image.webp)
  const markdownMatch = text.match(
    /^\[(https?:\/\/.+?)\]\(https?:\/\/.+?\)$/
  );

  if (markdownMatch) {
    return markdownMatch[1];
  }

  return text;
}

async function main() {
  const token = process.env.SETEC_TOKEN;

  if (!token) {
    console.error("Missing SETEC_TOKEN");
    console.error("");
    console.error("Run:");
    console.error(
      "SETEC_TOKEN='your_token' node scripts/scrapeSetec.js"
    );
    process.exit(1);
  }

  const products = [];

  for (let page = 1; page <= 14; page++) {
    console.log(`Setec: page ${page}/14...`);

    const data = await getPage(page, token);
    const pageProducts = extractProducts(data);
    

    console.log(`  Found ${pageProducts.length} products`);

    products.push(...pageProducts);
  }

    const tvs = products
    .map((product) => {
      const attributes = Array.isArray(product.attributes)
        ? product.attributes
        : [];

      const getAttribute = (name) => {
        const matches = attributes.filter(
          (a) =>
            a &&
            a.name === name &&
            a.value !== undefined &&
            String(a.value).trim() !== ""
        );

        return matches.length
          ? String(matches[matches.length - 1].value).trim()
          : null;
      };

      const sizeValue = getAttribute("Големина на екран");

      const sizeMatch = sizeValue
        ? String(sizeValue).match(/(\d+(?:[.,]\d+)?)/)
        : null;

      const price =
        product.variants?.[0]?.calculated_price?.calculated_amount ?? null;

      const regularPrice =
        product.variants?.[0]?.calculated_price?.original_amount ?? null;

      const quantity = Number(product.total_web_quantity ?? 0);

      return {
        brand: product.brand_name?.trim(),
        model: product.title?.trim(),

        price,
        regularPrice,
        inStock: quantity > 0,

        image: cleanImageUrl(
          product.images?.[0]?.url || product.thumbnail
        ),

        handle: product.handle || null,

        size: sizeMatch
          ? Number(sizeMatch[1].replace(",", "."))
          : null,

        resolution: getAttribute("Резолуција"),
        technology: getAttribute("Технологија на телевизор"),
        os: getAttribute("Оперативен систем"),

        store: "Setec",
      };
    })
    .filter((tv) => tv.brand && tv.model);
    

  const unique = Array.from(
    new Map(
      tvs.map((tv) => [
        `${tv.brand.toLowerCase()}|${tv.model.toLowerCase()}`,
        tv,
      ])
    ).values()
  );

  const withImages = unique.filter((tv) => tv.image).length;

  console.log("");
  console.log(`Setec products: ${products.length}`);
  console.log(`Unique TVs: ${unique.length}`);
  console.log(`With images: ${withImages}`);
  console.log(`Without images: ${unique.length - withImages}`);
  const withPrices = unique.filter((tv) => tv.price !== null).length;
const inStock = unique.filter((tv) => tv.inStock).length;

console.log(`With prices: ${withPrices}`);
console.log(`In stock: ${inStock}`);

  fs.writeFileSync(
    "src/data/setecTvs.json",
    JSON.stringify(unique, null, 2)
  );

  console.log("");
  console.log("Saved to: src/data/setecTvs.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});