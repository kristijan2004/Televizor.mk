// Headless screenshot driver for the Televizor.mk site.
//
// Usage (from the project root, with the dev server already running):
//   node .claude/skills/run-televizor/driver.mjs [path ...]
//
// Defaults to the homepage and the first novosti article. Env vars:
//   BASE_URL   default http://localhost:3000
//   OUT_DIR    default <project>/.claude/skills/run-televizor/screenshots
//   WIDTH      viewport width, default 1280 (use 390 for a phone check)
//   CHANNEL    browser channel, default "chrome" (falls back to "msedge")
//
// Exits non-zero if a page fails to load, logs a console error (React
// "Warning:" messages are only reported), or has horizontal overflow.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.OUT_DIR || path.join(here, "screenshots");
const WIDTH = Number(process.env.WIDTH || 1280);

function firstArticlePath() {
  const dir = path.join(root, "src/content/novosti");
  const file = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"))
    .sort()[0];
  const raw = fs.readFileSync(path.join(dir, file), "utf8");
  const slug = raw.match(/^slug:\s*"?([^"\r\n]+)"?/m)?.[1] || file.replace(/\.md$/, "");
  return `/novosti/${slug}`;
}

const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/", firstArticlePath()];

async function launch() {
  const preferred = process.env.CHANNEL || "chrome";
  for (const channel of [preferred, "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      console.warn(`could not launch channel "${channel}": ${e.message.split("\n")[0]}`);
    }
  }
  return chromium.launch({ headless: true });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

let failed = false;

for (const p of paths) {
  errors.length = 0;
  const url = new URL(p, BASE_URL).href;
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  const title = await page.title();
  const h1 = (await page.locator("h1").first().textContent().catch(() => ""))?.trim();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  const name = (p === "/" ? "home" : p.replace(/^\/+/, "").replace(/[\/:?&=]+/g, "_")) + `-${WIDTH}.png`;
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: true });

  console.log(`${res?.status()} ${url}`);
  console.log(`  title: ${title}`);
  console.log(`  h1:    ${h1 || "(none)"}`);
  console.log(`  shot:  ${file}`);
  if (overflow > 0) console.log(`  WARN horizontal overflow: ${overflow}px`);
  // React dev-mode "Warning: ..." messages are reported but do not fail the run.
  const real = errors.filter((e) => !e.startsWith("Warning:"));
  for (const e of errors) {
    const kind = e.startsWith("Warning:") ? "react warning" : "console error";
    console.log(`  ${kind}: ${e.split("\n")[0].slice(0, 200)}`);
  }

  if (!res || !res.ok() || real.length || overflow > 0) failed = true;
}

await browser.close();
process.exit(failed ? 1 : 0);
