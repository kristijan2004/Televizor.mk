// Најевтина цена од `stores` — иста логика како buildOffers/buildEntry во
// src/lib/tvSpecs.js (прво залихи во стока, инаку било која цена), но тука
// директно над суровиот `stores` објект од базата/masterTvs.json, без да се
// гради целиот каталог само за еден телевизор.
export function cheapestPrice(stores) {
  const offers = Object.values(stores || {}).filter(
    (store) => typeof store?.price === "number"
  );

  if (offers.length === 0) return null;

  const inStock = offers.filter((store) => store.inStock === true);
  const pool = inStock.length > 0 ? inStock : offers;

  return Math.min(...pool.map((store) => store.price));
}
