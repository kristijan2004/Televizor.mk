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
  specsSource     TEXT,
  specialFeatures TEXT
);

CREATE INDEX IF NOT EXISTS idx_tvs_brand       ON tvs(brand);
CREATE INDEX IF NOT EXISTS idx_tvs_size        ON tvs(size);
CREATE INDEX IF NOT EXISTS idx_tvs_technology  ON tvs(technology);
CREATE INDEX IF NOT EXISTS idx_tvs_year        ON tvs(year);
CREATE INDEX IF NOT EXISTS idx_tvs_brand_model ON tvs(brand, model);

-- Админ панел: еден администратор, сесии и историја на промени.
--
-- „Еден администратор" се спроведува надвор од базата — нема рута за
-- регистрација, create-admin.js секогаш врши upsert на истото корисничко
-- име. Табелата сепак дозволува повеќе редови, за да не треба промена на
-- шемата ако некогаш затреба втор администратор.

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  csrf_token  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- brand/model се чуваат директно (не само tv_id) за да историјата остане
-- читлива дури и ако записот подоцна исчезне.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tv_id       TEXT NOT NULL,
  brand       TEXT,
  model       TEXT,
  changed_by  TEXT NOT NULL,
  changed_at  INTEGER NOT NULL,
  diff        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_tv ON admin_audit_log(tv_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_changed_at ON admin_audit_log(changed_at DESC);

-- „Следи ја цената" — известување по е-пошта кога цената на телевизор падне.
--
-- Двојна потврда (confirmed + confirm_token): без неа било кој може да
-- внесе туѓа е-пошта и да ја претплати на известувања за случаен телевизор.
-- unsub_token е посебен од confirm_token за да линкот за отпишување во секоја
-- идна е-пошта остане валиден дури и по потврдата.
--
-- last_notified_price е референтната цена за споредба — не цената при
-- додавање, туку цената при ПОСЛЕДНОТО известување, за да паѓање па качување
-- па повторно паѓање под истото ниво пак се пријави.
CREATE TABLE IF NOT EXISTS favorites (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tv_id               TEXT NOT NULL,
  email               TEXT NOT NULL,
  confirmed           INTEGER NOT NULL DEFAULT 0,
  confirm_token       TEXT,
  unsub_token         TEXT NOT NULL,
  last_notified_price INTEGER,
  created_at          INTEGER NOT NULL,
  confirmed_at        INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_tv_email ON favorites(tv_id, email);
CREATE INDEX IF NOT EXISTS idx_favorites_email ON favorites(email);
CREATE INDEX IF NOT EXISTS idx_favorites_confirmed ON favorites(confirmed);
