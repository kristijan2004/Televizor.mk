---
name: write-novosti-article
description: Write, finish, fact-check or fix a Новости (news) article for Televizor.mk so it's ready to deploy. Use when asked to write an article, blog post or news about TVs in Macedonian, or to finish or clean up an existing article in src/content/novosti. Researches official sources, checks local availability at Neptun/Setec/Anhoch/DDStore (no prices in articles), validates the markdown and previews it.
---

# Write a finished Новости article

Articles are markdown files in `src/content/novosti/<slug>.md`. `scripts/buildNews.js` compiles them into
`src/Data/news.generated.json`, and they're served at `/novosti/<slug>`. Folder rules: `src/content/novosti/README.md`.

**The rule: every article you hand over is finished.** No `<!-- -->` notes, no "провери пред објава", no TODO,
no `[цена]` placeholders, nothing left for the user to fill in. If a fact can't be verified, either leave it out
or say it plainly in the text, with a date ("Во моментот на пишување, 6 октомври 2026, моделот сè уште не е
достапен кај македонските продавачи."). Never invent specs, dates or availability.

**No prices.** The user doesn't want prices in articles: no amounts in денари, euros or dollars, no "чини X",
no installment amounts. Describe cost only in words ("врвна класа", "средна класа", "поевтин од минатогодишниот модел").
The checker fails on any price amount.

Only touch `src/content/novosti/` and `public/images/novosti/`. Other people work on the rest of the code.

All commands below are run from the project root `E:\televizor\Televizor.mk` (PowerShell).

## 1. Pick the topic and avoid duplicates

```powershell
node .claude/skills/write-novosti-article/check-article.mjs --all
```

This lists every article and whether it's ready. Read any existing article on the same subject, and update it instead
of writing a second one.

Categories (exactly one): `Новости` (news, launches), `Рецензии` (reviews of a model), `Совети` (buying guides),
`Понуди` (deals and when to buy, written without concrete prices).

## 2. Research (WebSearch + WebFetch)

- Specs and launch facts: the **manufacturer's own pages** first (lg.com, samsung.com, sony, hisense, tcl, philips),
  then the manufacturer's newsroom. Use reviews (e.g. rtings.com, tvreviews sites) only for measurements, and
  name the source.
- Use at least two independent sources for anything surprising. If sources disagree, use the manufacturer figure
  or leave the number out.
- Model names differ by region (LG `OLED65B6...`, at Neptun `LG 65 B6 ELC`). Match the exact local variant before
  you say it's sold here.
- Keep the URLs you used. They go into the `## Извори` section.

## 3. Local availability (no prices)

When the article names specific models, check whether they're sold in Macedonia:

```powershell
node .claude/skills/write-novosti-article/find-model.mjs lg 65 b6
```

This searches the scraped retailer data (a read-only snapshot, about 1 October 2026). Every word must match brand +
model + name. It prints store, stock and product link. The prices it shows are for your reference only and never
go into the article. In the text, say only which shops carry the model ("достапен кај Нептун и Сетек") or that it
isn't sold here yet, with the date you checked. Anhoch and DDStore block automated access to their sites, so for
them rely only on the snapshot.

To link to a TV page on our own site, take `brand` and `model` from `src/Data/masterTvs.json` and use
`/tv/<brand lowercased>/<model lowercased>` (encode spaces as `%20`). Open the link in step 6 to confirm it works.

## 4. Write the file

Create `src/content/novosti/<slug>.md`. The slug uses lowercase latin letters and hyphens only (transliterate the Macedonian
title: `oled-ili-mini-led-sto-da-izberes`), and the frontmatter `slug` must equal the file name.

```markdown
---
title: "Наслов на македонски"
slug: "ime-na-fajlot"
date: "2026-10-06"
category: "Новости"
excerpt: "Една до две реченици (до ~250 знаци) што кажуваат зошто вреди да се прочита."
author: "Редакција на Телевизор.мк"
image: "/images/novosti/ime-na-fajlot.jpg"
readTime: 5
featured: false
---

Воведен пасус: веднаш кажи што е новото и зошто е важно за купувач во Македонија.

## Поднаслов
...

## Накратко
- три до пет клучни точки

## Извори
- [LG — OLED B6 (официјална страница)](https://www.lg.com/...)
- [Нептун — LG 65 B6 ELC](https://www.neptun.mk/categories/televizori/...)
```

What the article page can render: paragraphs, `##`/`###` headings, `-` and `1.` lists, `>` quotes, `---` divider,
`**bold**`, `*italic*`, `` `code` ``, `[links](url)`. It **can't** render tables (they show as a line of `|`
characters, so use a list), inline images, raw HTML or HTML comments (both show up as visible text).

Writing style (match the existing articles):
- Macedonian Cyrillic, standard literary Macedonian. Address the reader informally with "ти". Use „…" quotes and a decimal
  comma (`0,3 отсто`). Write sizes as `65"` or `65 инчи`. Brand and model names stay in Latin script.
- 450 to 900 words. Every section should help someone deciding what to buy, and end with what it means *кај нас*
  (in Macedonia): availability, class (entry, mid-range, top end) and who it's for. No prices.
- Avoid filler and hype ("револуционерен", "неверојатен"). Explain jargon in a short clause the first time
  (OLED, Mini LED, HDR, VRR, ALLM).
- `readTime`: words ÷ 200, rounded. Use `featured: true` only for the one lead story, and set the old lead back to `false`.
- `## Извори` with links is required for `Новости`, `Рецензии` and `Понуди`, and optional for `Совети`.

## 5. Image

Use the picture at `public/images/novosti/<slug>.jpg` (same name as the slug). Only use images the user supplies or ones
you're allowed to reuse (manufacturer press kits that permit editorial use). Don't hotlink from shops. If there's
no image yet, tell the user the exact file name to add. The page shows a placeholder until then, and that's the
only acceptable gap.

## 6. Check and preview

```powershell
node .claude/skills/write-novosti-article/check-article.mjs <slug>
npm run build:news
```

`check-article.mjs` must print `READY`. It fails on comments, editor notes, placeholders, price amounts, tables, raw HTML,
fewer than 350 words, a wrong category or slug, or a missing `## Извори`. A missing image is only a WARN.

Then look at it with the run-televizor skill (dev server on a free port, e.g. 3100):

```powershell
$env:BASE_URL='http://localhost:3100'; node .claude/skills/run-televizor/driver.mjs /novosti/<slug>
```

Open the screenshot and read it: the title, the excerpt on `/novosti`, and that lists, links and headings look right.

## 7. Hand over

Tell the user the file path, the sources used, where the model is available (and the date checked), and the image file still
needed (if any). Don't commit unless asked. If you commit, commit only the `.md` (and image), and not
`src/Data/news.generated.json` when only its `generatedAt` timestamp changed.

## Gotchas

- Neptun links in `src/Data/neptunTvs.json` are missing `/categories/televizori/` and return 404. `find-model.mjs`
  fixes them.
- Anhoch and DDStore return 403 to both headless Chrome and WebFetch, so use only their scraped snapshot. Neptun
  product pages (the fixed `/categories/televizori/` links) open with WebFetch and show the product name, which is
  enough to confirm a model is listed.
- `buildNews.js` keeps HTML comments as visible text, which is why the old articles show their editor notes on the page.
- PowerShell `Get-Content` shows Cyrillic as mojibake. The files themselves are UTF-8. Use the Read tool or Bash `cat`.
