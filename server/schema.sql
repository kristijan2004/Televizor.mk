-- Телевизори.
--
-- Полињата по кои се филтрира и сортира се вистински колони (брзо, со индекс).
-- hdrFormats и stores се JSON текст, зашто се листи/објекти.
--
-- Мониторите и таблетите подоцна добиваат СВОИ табели во истата датотека
-- (monitors, tablets) со свои колони. Намерно нема заедничка `products`
-- табела со `category` колона: само ~1/3 од овие полиња важат за монитор,
-- а таблет не дели речиси ништо освен brand/model/size/resolution/year.

CREATE TABLE IF NOT EXISTS tvs (
  id              TEXT PRIMARY KEY,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  size            INTEGER,
  technology      TEXT,
  resolution      TEXT,
  refreshRate     INTEGER,
  year            INTEGER,

  os              TEXT,
  hdr             INTEGER,
  dolbyVision     INTEGER,
  hdmi            INTEGER,
  usb             INTEGER,
  vrr             INTEGER,
  allm            INTEGER,
  pictureProcessor TEXT,
  hdrFormats      TEXT,
  brightness      TEXT,
  audioPower      INTEGER,
  audioChannels   TEXT,
  dolbyAtmos      INTEGER,
  freeSync        INTEGER,
  gSync           INTEGER,

  image           TEXT,
  stores          TEXT,
  specsSource     TEXT
);

CREATE INDEX IF NOT EXISTS idx_tvs_brand       ON tvs(brand);
CREATE INDEX IF NOT EXISTS idx_tvs_size        ON tvs(size);
CREATE INDEX IF NOT EXISTS idx_tvs_technology  ON tvs(technology);
CREATE INDEX IF NOT EXISTS idx_tvs_year        ON tvs(year);
CREATE INDEX IF NOT EXISTS idx_tvs_brand_model ON tvs(brand, model);
