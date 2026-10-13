/*
  Дали дошло времето за оваа статија — исто правило и на клиент и на сервер.

  Извадено од src/Data/news.js за да може и server/index.js (sitemap и
  og:/title инјектирањето) да го проверува истото нешто без да увезува JSON
  преку ESM (ризично во Node без --experimental-json-modules) и без да
  препишува истата логика на второ место.
*/
function publishTime(article) {
  const stamp = article.publishAt || article.date;
  if (!stamp) return 0;

  /*
    Browsers read a bare `2026-10-15` as UTC but `2026-10-15T00:00` as local
    time, so midnight is written out explicitly. That way an article scheduled
    for the 15th appears on the 15th as the reader's own clock sees it.
  */
  const local = stamp.includes(":") ? stamp.replace(" ", "T") : `${stamp}T00:00`;

  const time = new Date(local).getTime();

  // A date we cannot read should not quietly swallow an article.
  return Number.isNaN(time) ? 0 : time;
}

export function isPublished(article, now = Date.now()) {
  return publishTime(article) <= now;
}

export default isPublished;
