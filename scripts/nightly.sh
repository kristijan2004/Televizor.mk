#!/usr/bin/env bash
#
# Ноќно скрапирање на серверот.
#
# ВАЖНО: ништо живо не се менува. Скриптата гради КАНДИДАТ во staging/ и
# пишува извештаи. Живата src/Data/masterTvs.json и базата остануваат
# недопрени додека ти не одобриш.
#
# Што прави:
#   1. ги чита Setec, Neptun и DDStore (Anhoch е зад Cloudflare challenge и
#      се чита рачно од дома — види README-RAZVOJ.md)
#   2. проверува дали резултатот е разумен; ако некој трговец врати премалку,
#      тој се прескокнува наместо да ги расипе податоците
#   3. гради кандидат masterTvs.json во staging/
#   4. ги запишува промените во цените (додавање, не менување) и извештаите
#
# Се пушта од cron. Рачно:  bash /opt/display-mk/scripts/nightly.sh

set -uo pipefail

ROOT="/opt/display-mk"
SCRATCH="$ROOT/src/data"      # мала d — тука пишуваат скраперите
LIVE="$ROOT/src/Data"         # голема D — од тука чита апликацијата
STAGING="$ROOT/staging"
REPORTS="$ROOT/reports"
LOG="$REPORTS/nightly-$(date +%F).log"

mkdir -p "$SCRATCH" "$REPORTS"
exec > >(tee -a "$LOG") 2>&1

echo "=============================================="
echo "Ноќно скрапирање — $(date '+%F %T')"
echo "=============================================="

cd "$ROOT"

# Најмал прифатлив број производи по трговец. Под ова значи дека нешто е
# скршено (блокада, сменета страница), па старите податоци се задржуваат.
declare -A MIN=( [setecTvs]=150 [neptunTvs]=80 [ddstoreTvs]=30 )

run_scraper() {
  local name="$1" script="$2" file="$3"
  echo
  echo "--- $name ---"

  if ! timeout 900 node "scripts/$script" >/dev/null 2>&1; then
    echo "  ❌ скриптата падна — се задржува претходната датотека"
    return 1
  fi

  local path="$SCRATCH/$file.json"
  if [ ! -f "$path" ]; then
    echo "  ❌ нема $path"
    return 1
  fi

  local count
  count=$(node -e "try{console.log(require('$path').length)}catch(e){console.log(0)}")
  local min=${MIN[$file]}

  if [ "$count" -lt "$min" ]; then
    echo "  ❌ само $count производи (очекувано барем $min) — се отфрла"
    return 1
  fi

  echo "  ✓ $count производи"
  return 0
}

OK_SETEC=0; OK_NEPTUN=0; OK_DDSTORE=0

# Setec бара токен што се фаќа од страницата со прелистувач.
echo
echo "--- Setec токен ---"
SETEC_TOKEN=$(timeout 120 node -e '
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  let t = null;
  p.on("request", (r) => {
    const a = r.url().includes("solslab") ? r.headers()["authorization"] : null;
    if (a && !t) t = a.replace(/^Bearer\s+/i, "");
  });
  await p.goto("https://setec.mk/", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await b.close();
  if (t) process.stdout.write(t);
})();
' 2>/dev/null)

if [ -n "$SETEC_TOKEN" ]; then
  echo "  ✓ токенот е земен"
  export SETEC_TOKEN
  run_scraper "Setec"   scrapeSetec.js   setecTvs   && OK_SETEC=1
else
  echo "  ❌ нема токен — Setec се прескокнува"
fi

run_scraper "Neptun"  scrapeNeptun.js  neptunTvs  && OK_NEPTUN=1
run_scraper "DDStore" scrapeDDStore.js ddstoreTvs && OK_DDSTORE=1

if [ $((OK_SETEC + OK_NEPTUN + OK_DDSTORE)) -eq 0 ]; then
  echo
  echo "❌ ниеден трговец не успеа — нема што да се гради"
  exit 1
fi

# ---------------------------------------------------------------
# Кандидат во staging. Живите податоци не се допираат.
# ---------------------------------------------------------------
echo
echo "--- градење кандидат ---"
rm -rf "$STAGING"
mkdir -p "$STAGING/scripts" "$STAGING/src/Data"
cp "$ROOT"/scripts/*.js "$STAGING/scripts/"

# основата и постоечките спецификации доаѓаат од живите податоци
cp "$LIVE/master-tvs.json" "$LIVE/masterTvs.json" "$STAGING/src/Data/"

# Anhoch секогаш од живите (не се скрапира овде)
cp "$LIVE/anhochTvs.json" "$STAGING/src/Data/"

# свежите само ако поминале проверка, инаку старите
[ $OK_SETEC   -eq 1 ] && cp "$SCRATCH/setecTvs.json"   "$STAGING/src/Data/" || cp "$LIVE/setecTvs.json"   "$STAGING/src/Data/"
[ $OK_NEPTUN  -eq 1 ] && cp "$SCRATCH/neptunTvs.json"  "$STAGING/src/Data/" || cp "$LIVE/neptunTvs.json"  "$STAGING/src/Data/"
[ $OK_DDSTORE -eq 1 ] && cp "$SCRATCH/ddstoreTvs.json" "$STAGING/src/Data/" || cp "$LIVE/ddstoreTvs.json" "$STAGING/src/Data/"

( cd "$STAGING" && node scripts/buildMasterTvs.js 2>&1 | tail -4 )

CANDIDATE="$STAGING/src/Data/masterTvs.json"
if [ ! -f "$CANDIDATE" ]; then
  echo "❌ кандидатот не е изграден"
  exit 1
fi

echo "  кандидат: $(node -e "console.log(require('$CANDIDATE').length)") телевизори"

# ---------------------------------------------------------------
# Промени во цените — ова е единственото нешто што се запишува,
# и само додава редови; ништо не се менува наназад.
# ---------------------------------------------------------------
echo
echo "--- промени во цените ---"
node scripts/checkPriceChanges.js --master "$CANDIDATE" --write 2>&1 | sed -n "/Поевтинети/,/извештај/p"

# ---------------------------------------------------------------
# Нови телевизори — само извештај
# ---------------------------------------------------------------
echo
echo "--- нови телевизори ---"
node scripts/checkNewTvs.js --stores Setec,Neptun,DDStore 2>&1 | tail -6

echo
echo "=============================================="
echo "Готово — $(date '+%F %T')"
echo "Живите податоци НЕ се сменети. Кандидатот е во:"
echo "  $CANDIDATE"
echo "Извештаи: $REPORTS"
echo "=============================================="
