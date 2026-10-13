// Downloads an image through headless Chrome, for sites that block plain
// downloads with a browser check (e.g. news.lgdisplay.com).
//
// Usage (from the project root):
//   node .claude/skills/write-novosti-article/fetch-image.mjs <image url> <output file> [page url]
//
// Pass the page the image appears on as [page url] when the site needs its
// cookies first. Refuses to save anything that is not an image.

import { chromium } from "playwright";
import fs from "node:fs";

const [url, out, pageUrl] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: fetch-image.mjs <image url> <output file> [page url]");
  process.exit(2);
}

let browser;
for (const channel of ["chrome", "msedge", undefined]) {
  try { browser = await chromium.launch({ channel, headless: true }); break; } catch {}
}

const page = await browser.newPage();
try {
  if (pageUrl) {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
  }
  let res = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  let type = res?.headers()["content-type"] || "";
  // A browser check page comes first on some sites; give it a moment, then retry.
  if (!type.startsWith("image/")) {
    await page.waitForTimeout(4000);
    res = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    type = res?.headers()["content-type"] || "";
  }
  if (!type.startsWith("image/")) {
    console.log(`ERROR not an image (${res?.status()} ${type}): ${url}`);
    process.exitCode = 1;
  } else {
    const body = await res.body();
    fs.writeFileSync(out, body);
    console.log(`saved ${out}  (${type}, ${Math.round(body.length / 1024)} KB)`);
  }
} catch (e) {
  console.log(`ERROR ${url}: ${e.message.split("\n")[0]}`);
  process.exitCode = 1;
}
await browser.close();
