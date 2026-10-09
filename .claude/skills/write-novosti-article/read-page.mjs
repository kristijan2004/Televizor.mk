// Reads a web page's text in headless Chrome. Use it when WebFetch only returns
// menus (RTINGS, TechRadar and Tom's Guide render articles with JavaScript).
//
// Usage (from the project root):
//   node .claude/skills/write-novosti-article/read-page.mjs <url> [regex] [maxChars]
//
// With a regex, prints only the lines that match (case-insensitive) — handy for
// pulling one fact out of a long review. Without, prints the page text.

import { chromium } from "playwright";

const [url, pattern, max = "12000"] = process.argv.slice(2);
if (!url) {
  console.error("usage: read-page.mjs <url> [regex] [maxChars]");
  process.exit(2);
}

let browser;
for (const channel of ["chrome", "msedge", undefined]) {
  try { browser = await chromium.launch({ channel, headless: true }); break; } catch {}
}

const page = await browser.newPage();
try {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  const text = await page.locator("body").innerText();
  console.log(`${res?.status()} ${url}`);
  if (pattern) {
    const re = new RegExp(pattern, "i");
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 12 && re.test(l));
    console.log(lines.map((l) => `- ${l}`).join("\n").slice(0, Number(max)) || "(no matching lines)");
  } else {
    console.log(text.slice(0, Number(max)));
  }
} catch (e) {
  console.log(`ERROR ${url}: ${e.message.split("\n")[0]}`);
  process.exitCode = 1;
}
await browser.close();
