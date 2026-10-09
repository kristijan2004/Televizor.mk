---
name: run-televizor
description: Run, start, build, preview and screenshot the Televizor.mk site (React / Create React App) or one of its novosti articles. Use to launch the dev server, rebuild the news articles from markdown, take headless Chrome screenshots of the homepage or /novosti/<slug>, and check a change actually works in the browser.
---

# Run Televizor.mk

Create React App site (`react-scripts` 5). Articles are markdown in
`src/content/novosti/*.md`, compiled by `scripts/buildNews.js` into
`src/Data/news.generated.json` (runs automatically before `npm start` / `npm run build`).
Routes: `/`, `/novosti`, `/novosti/:slug`, `/tv/:brand/:model`, `/compare`, `/edu`, `/odberi-tv`.

All commands below are PowerShell and were run from the project root `E:\televizor\Televizor.mk`.

## Prerequisites

- Node 24 / npm 11 (tested with v24.19.0 / 11.17.0).
- Google Chrome or Microsoft Edge installed. The driver uses `playwright` (already a
  dependency) with `channel: "chrome"` and falls back to `msedge`, so **no
  `npx playwright install` is needed**.

```powershell
npm install
```

The `npm warn allow-scripts ... postinstall` lines (fontawesome, core-js) are harmless.

## Build

```powershell
npm run build          # runs build:news first, output in build\
npm run build:news     # only recompile the markdown articles
```

Expect ESLint `no-unused-vars` warnings; the build still succeeds ("The build folder is ready to be deployed").

## Run (agent path: dev server + screenshot driver)

1. Check whether the user already has a dev server on 3000. If so, **don't kill it**. Either reuse it or start yours on another port:

   ```powershell
   curl.exe -s -o NUL -w "%{http_code}\n" -m 5 http://localhost:3000/
   ```

2. Start the dev server in the background (Bash/PowerShell tool with `run_in_background`):

   ```powershell
   $env:BROWSER='none'; $env:PORT='3100'; npm start
   ```

3. Wait until it's ready (it's usually up within seconds; first compile can take ~30 s):

   ```powershell
   for ($i=0; $i -lt 100; $i++) { $c = curl.exe -s -o NUL -w "%{http_code}" -m 2 http://localhost:3100/; if ($c -eq '200') { "ready after ~$i s"; break }; Start-Sleep 1 }
   ```

4. Screenshot the homepage and the first novosti article (alphabetical by filename):

   ```powershell
   $env:BASE_URL='http://localhost:3100'; node .claude/skills/run-televizor/driver.mjs
   ```

   Other pages / phone width:

   ```powershell
   $env:BASE_URL='http://localhost:3100'; $env:WIDTH='390'; node .claude/skills/run-televizor/driver.mjs /novosti
   ```

   For each path it prints the HTTP status, `<title>`, first `<h1>`, any console errors, and horizontal overflow,
   and saves a full-page PNG to `.claude/skills/run-televizor/screenshots/<page>-<width>.png`.
   **Open the PNG with the Read tool and look at it.** Exit code 1 means a load failure, a real console error,
   or horizontal overflow. React dev `Warning:` messages are printed but don't fail the run.

5. Stop the background server task when done.

## Run (human path)

```powershell
npm start
```

This opens http://localhost:3000 in your browser and hot-reloads on save.
For the production build: `npm run build`, then serve `build\` with any static server
(CRA suggests `npx serve -s build`, which isn't verified here).

## Adding / previewing an article

1. Copy an existing `.md` in `src/content/novosti/`, rename it (lowercase, hyphens). The filename (or `slug:` frontmatter) is the URL slug.
   Required frontmatter: `title`, `category`, `date` (YYYY-MM-DD). Prefix the filename with `_` to keep it as a draft. See `src/content/novosti/README.md`.
2. Rebuild the articles. The dev server does **not** watch the `.md` files:
   ```powershell
   npm run build:news
   ```
   The running dev server picks up the regenerated JSON automatically. The script lists articles without a picture and the exact filename to drop into `public/images/novosti/`.
3. Preview it:
   ```powershell
   $env:BASE_URL='http://localhost:3100'; node .claude/skills/run-televizor/driver.mjs /novosti/<slug>
   ```

## Test

`npm test` exists but the only test (`src/App.test.js`) is the CRA boilerplate ("learn react", renders `<App/>` without a Router), so it **fails**:

```powershell
$env:CI='true'; npm test -- --watchAll=false
```

Use `npm run build` and the screenshot driver as the real check.

## Gotchas

- **`news.generated.json` is always dirty.** Every `npm start`/`npm run build`/`build:news` rewrites `generatedAt`, so `git status` shows `src/Data/news.generated.json` modified even when no article changed.
- **HTML comments render as text.** `buildNews.js` doesn't strip `<!-- ... -->`, so a comment in an article body shows up on the page as a paragraph (e.g. `koga-e-najdobro-da-kupis-televizor.md`).
- `Invoke-WebRequest` against the dev server hung on this machine. Use `curl.exe` (not the `curl` alias) for readiness checks.
- Without `BROWSER=none`, `npm start` tries to open a browser window.
- If port 3000 is busy, `npm start` prints "Something is already running on port 3000." and **exits with code 0**. Check the log; don't assume it started.
- The homepage logs a React warning from `SubNavigation` (non-boolean `active` attribute on a `<button>`). It's pre-existing and harmless.
- PowerShell output shows Cyrillic as mojibake when you `Get-Content` the `.md`/`.js` files. The files themselves are UTF-8 and fine.

## Troubleshooting

- `Something is already running on port 3000.` → another dev server (often the user's own) is running. Find it with
  `Get-NetTCPConnection -LocalPort 3000 -State Listen`, and use `$env:PORT='3100'` instead of killing it.
- Readiness loop using `Invoke-WebRequest` never finished (tool timed out) → switch to `curl.exe` as shown above.
