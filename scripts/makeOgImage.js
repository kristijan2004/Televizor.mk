// Generates public/og-image.png: the default 1200x630 share image used when
// a page has no image of its own (server/index.js DEFAULT_SHARE_IMAGE,
// src/lib/usePageMeta.js DEFAULT_SHARE_IMAGE).
//
// Renders a static HTML card with Playwright (already a dependency — no new
// packages) and screenshots it at the exact target size, instead of hand
// editing a binary image file.
//
// Usage:
//   node scripts/makeOgImage.js

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT_FILE = path.join(__dirname, "..", "public", "og-image.png");

const WIDTH = 1200;
const HEIGHT = 630;

// Матч на бренд бојата (#242582) и фонтовите (Manrope/Open Sans) што веќе ги
// користи сајтот (public/index.html, Navigation.js LogoTitle/LogoIcon).
const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Open+Sans:wght@400;600&display=swap"
  rel="stylesheet"
/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: #242582;
    font-family: "Open Sans", sans-serif;
    overflow: hidden;
  }
  .safe {
    width: 1000px;
    height: 530px;
    margin: 50px auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 30px;
  }
  .logo-row {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .icon-tile {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.14);
    border-radius: 26px;
  }
  .wordmark {
    font-family: "Manrope", sans-serif;
    font-weight: 800;
    font-size: 84px;
    letter-spacing: 0.3px;
    color: #ffffff;
    white-space: nowrap;
  }
  .tagline {
    font-family: "Manrope", sans-serif;
    font-weight: 700;
    font-size: 42px;
    color: #ffffff;
    text-align: center;
  }
  .footer {
    font-family: "Open Sans", sans-serif;
    font-weight: 600;
    font-size: 24px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6);
  }
</style>
</head>
<body>
  <div class="safe">
    <div class="logo-row">
      <div class="icon-tile">
        <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4.5" width="20" height="13" rx="2"></rect>
          <line x1="8" y1="20.5" x2="16" y2="20.5"></line>
          <line x1="12" y1="17.5" x2="12" y2="20.5"></line>
        </svg>
      </div>
      <div class="wordmark">Display.mk</div>
    </div>
    <div class="tagline">Најди го твојот телевизор</div>
    <div class="footer">display.mk</div>
  </div>
</body>
</html>`;

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (e) {
      console.warn(`could not launch channel "${channel}": ${e.message.split("\n")[0]}`);
    }
  }
  return chromium.launch({ headless: true });
}

async function main() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  await page.setContent(html, { waitUntil: "networkidle" });
  // Чека фонтовите да се вчитаат пред снимка, иначе паѓа на fallback фонт.
  await page.evaluate(() => document.fonts.ready);

  await page.screenshot({ path: OUT_FILE, type: "png" });
  await browser.close();

  const { size } = fs.statSync(OUT_FILE);
  console.log(`Wrote ${OUT_FILE} (${(size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
