/*
  ~155 карактери, пресечено на граница на збор — исто правило на клиент
  (NewsArticle.js, Novosti.js) и сервер (server/index.js), за описот во
  Google никогаш да не застане среде збор.
*/
export function excerptFor(text, max = 155) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

export default excerptFor;
