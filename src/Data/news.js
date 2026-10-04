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

export const CATEGORIES = generated.categories;

const news = generated.articles;

export default news;
