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

  Статиите за „Еду“ се markdown-фајлови во `src/content/edu/`, а
  `scripts/buildNews.js` ги компајлира во `edu.generated.json`. Ова е истото
  што `news.js` го прави за Новости — разликата е само во папката и во фајлот.

  The Еду articles are markdown files in `src/content/edu/`, compiled by
  `scripts/buildNews.js` into `edu.generated.json`. This is exactly what
  `news.js` does for Новости; only the folder and the file differ. The build
  step runs automatically before `npm start` / `npm run build`, or on demand
  with `npm run build:news`.
*/

import generated from "./edu.generated.json";

/*
  Закажаното објавување е исто како кај Новости, па правилото се позајмува
  оттаму наместо да се препишува — една дефиниција, еден начин на однесување.

  Scheduled publishing works exactly as it does for Новости, so the rule is
  borrowed from there rather than copied: one definition, one behaviour. See
  the long comment in `news.js` for how `date` and `publishAt` are read.
*/
import { isPublished } from "./news";

const edu = generated.articles.filter((article) => isPublished(article));

// Hide a category that has nothing behind it yet.
const usedCategories = new Set(edu.map((article) => article.category));

export const CATEGORIES = generated.categories.filter((category) =>
  usedCategories.has(category)
);

export default edu;
