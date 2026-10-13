/*
  ============================================================================
  ПРИМЕРНА СОДРЖИНА — PLACEHOLDER CONTENT
  ============================================================================

  Сите статии се измислени. Цените, датумите, моделите, изјавите и достапноста
  кај трговците НЕ СЕ ВИСТИНСКИ и служат само за да се прикаже изгледот.

  Every article is invented placeholder content. The prices, dates,
  availability, model details and any claims about retailers are NOT REAL and
  exist only to demonstrate the layout. Replace all of it with real editorial
  before this goes anywhere near production.
  ============================================================================

  Статиите веќе не се пишуваат тука. Секоја статија е одделен markdown-фајл во
  `src/content/novosti/`, а `scripts/buildNews.js` ги компајлира во
  `news.generated.json`.

  Articles are no longer written in this file. Each article is a markdown file
  in `src/content/novosti/`, and `scripts/buildNews.js` compiles them into
  `news.generated.json`. That build step runs automatically before
  `npm start` / `npm run build`, or on demand with `npm run build:news`.
*/

import generated from "./news.generated.json";
import { isPublished } from "../lib/isPublished";

/*
  Закажано објавување — scheduled publishing.

  Статија со иден датум стои во проектот додека не ѝ дојде времето. `date` ја
  објавува на почетокот на тој ден, а ако сакаш точен час, додај
  `publishAt: "2026-10-15 09:00"` во frontmatter-от.

  An article dated in the future stays out of the listing (and out of the
  related-articles strip, and its own URL shows the "not found" card) until
  that moment arrives. The check runs in the browser, so nothing has to be
  rebuilt for an article to go live. The rule itself lives in
  `src/lib/isPublished.js` so the server's sitemap and meta injection can
  apply the exact same check — see that file.

  Worth knowing: a scheduled article is already inside the JavaScript bundle
  before its date. This schedules publication, it does not hide the text from
  someone who goes digging in the bundle. For that, keep the file named
  `_slug.md` until you are ready — buildNews.js skips those.
*/
export { isPublished };

const news = generated.articles.filter((article) => isPublished(article));

// Hide a category filter that has nothing behind it yet.
const usedCategories = new Set(news.map((article) => article.category));

export const CATEGORIES = generated.categories.filter((category) =>
  usedCategories.has(category)
);

export default news;
