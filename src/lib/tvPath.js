/*
  Единствен начин да се изгради /tv/:brand/:model патот.

  Порано секое место го градеше патот на свој начин — некои со мала буква
  без enkodiranje (TileCont), некои со голема буква со enkodiranje (OdberiTv,
  TvDetails) — па истиот телевизор имаше по неколку различни адреси, а 14
  Philips модели со "/" во името (пр. "43PFS6808/12") воопшто ги кршеа
  рутите без enkodiranje. Оваа функција е единствениот извор на вистина за
  каноничната адреса, и се користи и од клиентот и од серверот
  (server/index.js го импортира истиот фајл).
*/
export function tvPath(tv) {
  const brand = String(tv?.brand || "").toLowerCase();
  const model = String(tv?.model || "").toLowerCase();
  return `/tv/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`;
}

export default tvPath;
