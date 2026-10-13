// Lists the large images on a page (e.g. a manufacturer newsroom article), so
// you can pick an official press photo for an article.
//
// Usage (from the project root):
//   node .claude/skills/write-novosti-article/list-images.mjs <url> [minWidth]
//
// Prints each image's natural size, alt text and URL, biggest first. Also
// prints the page's og:image (the photo the publisher chose for sharing).

import { chromium } from "playwright";

const [url, minWidth = "600"] = process.argv.slice(2);
if (!url) {
  console.error("usage: list-images.mjs <url> [minWidth]");
  process.exit(2);
}

let browser;
for (const channel of ["chrome", "msedge", undefined]) {
  try { browser = await chromium.launch({ channel, headless: true }); break; } catch {}
}

const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
try {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Lazy-loaded images only appear after scrolling.
  for (let y = 0; y < 12; y++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(300);
  }
  const og = await page.locator('meta[property="og:image"]').first().getAttribute("content").catch(() => null);
  const imgs = await page.$$eval("img", (els) =>
    els.map((e) => ({ src: e.currentSrc || e.src, w: e.naturalWidth, h: e.naturalHeight, alt: e.alt || "" }))
  );
  const seen = new Set();
  const big = imgs
    .filter((i) => i.src && i.w >= Number(minWidth) && !seen.has(i.src) && seen.add(i.src))
    .sort((a, b) => b.w * b.h - a.w * a.h);
  console.log(`${res?.status()} ${url}`);
  if (og) console.log(`og:image  ${og}`);
  for (const i of big) console.log(`${i.w}x${i.h}  ${i.alt.slice(0, 80)}\n    ${i.src}`);
  if (!big.length) console.log(`(no images wider than ${minWidth}px)`);
} catch (e) {
  console.log(`ERROR ${url}: ${e.message.split("\n")[0]}`);
  process.exitCode = 1;
}
await browser.close();
