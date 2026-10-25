#!/usr/bin/env bash
#
# Ноќно скрапирање на серверот.
#
# Сè оди само: новите телевизори и новите цени завршуваат на сајтот без
# ничија интервенција.
#
# Што прави:
#   1. ги чита Setec, Neptun и DDStore (Anhoch е зад Cloudflare challenge и
#      се чита рачно од дома — види README-RAZVOJ.md)
#   2. проверува дали резултатот е разумен; ако некој трговец врати премалку,
#      тој се прескокнува наместо да ги расипе податоците
#   3. гради кандидат masterTvs.json во staging/
#   4. ги запишува промените во цените и извештаите
#   5. ОСИГУРУВАЧ: ако бројот на телевизори се смени за повеќе од 20%, не
#      промовира — тоа значи дека нешто пукнало, не дека стигнале 100 нови
#   6. го промовира кандидатот, ја полни базата и го рестартира API-то
#
# Сајтот ги чита телевизорите од API, па нема потреба од ново градење на
# фронтендот — новото се гледа веднаш.
#
# Пред секоја промоција се прави резервна копија masterTvs.auto-ДАТУМ.json
# (се чуваат последните 7), па враќањето наназад е копирање на еден фајл.
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

# ---------------------------------------------------------------
# Е-пошта со резиме по секое пуштање — без разлика дали успеало, стопирало
# на некој осигурувач, или паднало неочекувано.
#
# WARNINGS собира секое „нешто не е сосема во ред" низ скриптата (трговец
# прескокнат, осигурувач активиран итн) — не секое е exit 1, затоа мора да
# се собира одделно, не само да се гледа излезниот код. Испраќа преку
# `trap ... EXIT`, кое секогаш се активира при излез, вклучително exit 1 на
# средина од скриптата — инаку е-пошта би стигнала само при успешно
# завршување, а токму грешките се она што треба да се знае веднаш.
#
# API клучот е во $ROOT/.env.nightly (НЕ во git, читливо само за root) —
# истиот образец како лозинката на админ-панелот.
# ---------------------------------------------------------------
WARNINGS=()
PENDING_TONIGHT=0
PROMOTED="не"
FINAL_COUNT="?"

RESEND_API_KEY=""
NIGHTLY_EMAIL_TO=""
[ -f "$ROOT/.env.nightly" ] && source "$ROOT/.env.nightly"

send_summary_email() {
  local exit_code=$?

  if [ -z "$RESEND_API_KEY" ] || [ -z "$NIGHTLY_EMAIL_TO" ]; then
    return 0
  fi

  local status_line
  if [ "$PROMOTED" = "да" ]; then
    status_line="✓ Промовирано — $FINAL_COUNT телевизори живи."
  elif [ "$exit_code" -ne 0 ]; then
    status_line="❌ Запрено пред промоција (излезен код $exit_code) — живите податоци НЕ се допрени."
  else
    status_line="⚠ Завршено без промоција."
  fi

  local warnings_text="Нема предупредувања."
  if [ "${#WARNINGS[@]}" -gt 0 ]; then
    warnings_text=$(printf '%s\n' "${WARNINGS[@]}")
  fi

  local body
  body=$(cat <<BODY
Display.mk — ноќно скрапирање $(date '+%F %T')

$status_line

Нови модели на чекање вечерва: $PENDING_TONIGHT
(преглед/одобрување: https://display.mk/admin)

Предупредувања:
$warnings_text

— целосен лог: $LOG
BODY
)

  local subject="Display.mk ноќно скрапирање — $(date +%F)"
  if [ "$PROMOTED" != "да" ]; then
    subject="⚠ $subject (НЕ промовирано)"
  fi

  node -e '
const https = require("https");

const [apiKey, to, subject, text] = process.argv.slice(1);

const payload = JSON.stringify({
  from: "Display.mk <nightly@display.mk>",
  to: to.split(","),
  subject,
  text,
});

const req = https.request(
  {
    hostname: "api.resend.com",
    path: "/emails",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
      "Content-Length": Buffer.byteLength(payload),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      if (res.statusCode >= 300) {
        console.error("  ❌ Resend " + res.statusCode + ": " + data);
      } else {
        console.log("  ✓ е-пошта испратена");
      }
    });
  }
);

req.on("error", (e) => console.error("  ❌ е-пошта не успеа: " + e.message));
req.write(payload);
req.end();
' "$RESEND_API_KEY" "$NIGHTLY_EMAIL_TO" "$subject" "$body"
}

trap send_summary_email EXIT

# Најмал прифатлив број производи по трговец. Под ова значи дека нешто е
# скршено (блокада, сменета страница), па старите податоци се задржуваат.
declare -A MIN=( [setecTvs]=150 [neptunTvs]=80 [ddstoreTvs]=30 )

run_scraper() {
  local name="$1" script="$2" file="$3"
  echo
  echo "--- $name ---"

  if ! timeout 900 node "scripts/$script" >/dev/null 2>&1; then
    echo "  ❌ скриптата падна — се задржува претходната датотека"
    WARNINGS+=("$name: скриптата падна, се задржува претходната датотека")
    return 1
  fi

  local path="$SCRATCH/$file.json"
  if [ ! -f "$path" ]; then
    echo "  ❌ нема $path"
    WARNINGS+=("$name: нема излезна датотека")
    return 1
  fi

  local count
  count=$(node -e "try{console.log(require('$path').length)}catch(e){console.log(0)}")
  local min=${MIN[$file]}

  if [ "$count" -lt "$min" ]; then
    echo "  ❌ само $count производи (очекувано барем $min) — се отфрла"
    WARNINGS+=("$name: само $count производи (очекувано барем $min) — се отфрла")
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
  WARNINGS+=("Setec: не можеше да се земе токен, се прескокнува")
fi

run_scraper "Neptun"  scrapeNeptun.js  neptunTvs  && OK_NEPTUN=1
run_scraper "DDStore" scrapeDDStore.js ddstoreTvs && OK_DDSTORE=1

if [ $((OK_SETEC + OK_NEPTUN + OK_DDSTORE)) -eq 0 ]; then
  echo
  echo "❌ ниеден трговец не успеа — нема што да се гради"
  WARNINGS+=("Ниеден трговец не успеа — нема што да се гради")
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
  WARNINGS+=("Кандидатот не е изграден — buildMasterTvs.js не создаде masterTvs.json")
  exit 1
fi

echo "  кандидат: $(node -e "console.log(require('$CANDIDATE').length)") телевизори"

# ---------------------------------------------------------------
# ОСИГУРУВАЧ: нема дупликат id во кандидатот.
#
# Случи се на 2026-10-16/21: buildMasterTvs.js го исчистува повторениот
# бренд во името на моделот (на пр. „SAMSUNG SAMSUNG UE55..." -> „SAMSUNG
# UE55...") дури ПОСЛЕ id-то веќе е доделено, па два различни записи можат
# да завршат со ИСТ id. node import.js тогаш паѓа на „UNIQUE constraint
# failed" — и БЕЗ оваа проверка, тоа се случуваше ТИВКО: базата останува
# во половично увезена состојба (само неколку редови) со денови, сајтот
# изгледа „празен", никој не е известен. Подобро nightly.sh да застане
# тука отколку да промовира кандидат што ќе го скрши увезувањето.
# ---------------------------------------------------------------
DUP_IDS=$(node -e "
const tvs = require('$CANDIDATE');
const seen = new Map();
for (const t of tvs) {
  seen.set(t.id, (seen.get(t.id) || 0) + 1);
}
const dupes = [...seen.entries()].filter(([, n]) => n > 1);
for (const [id, n] of dupes) console.log(id + ' x' + n);
")

if [ -n "$DUP_IDS" ]; then
  echo "❌ дупликат id во кандидатот — НЕ продолжувам:"
  echo "$DUP_IDS" | sed 's/^/     /'
  echo "   Кандидатот стои во $CANDIDATE за рачна проверка."
  WARNINGS+=("Дупликат id во кандидатот — промоцијата е запрена: $DUP_IDS")
  exit 1
fi

# ---------------------------------------------------------------
# Секој НОВ телевизор чека рачно одобрување — без исклучок.
#
# Порано само новите модели без големина/слика паѓаа во чекање; модел со
# целосни спецификации одеше право на сајтот. Сега нема таква разлика:
# ама било кој модел што не бил претходно жив (не е во oldIds) чека преглед,
# дури и ако веќе има големина и слика — админот сака прво да ги погледне
# спецификациите, не само да провери дали недостасува нешто. Постоечките
# телевизори (веќе живи) никогаш не се допираат овде, дури и ако моментално
# им недостасува нешто — само нови модели се прашуваат.
#
# Таквите не одат директно на сајтот — паѓаат во pendingTvs.json, каде
# админ-панелот (таб „Чекаат одобрување") дозволува преглед, уредување и
# рачно одобрување. Веќе одбиени модели (REJECTED_FILE, запишан од истиот
# панел) никогаш не се враќаат во чекање — admin веќе рекол „не", нема
# смисла да праша секоја ноќ истото.
# ---------------------------------------------------------------
echo
echo "--- нови модели ---"
node -e '
const fs = require("fs");
const file = process.argv[1];
const liveFile = process.argv[3];
const pendingFile = process.argv[4];
const rejectedFile = process.argv[5];

const readArr = (f) => {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return []; }
};

const tvs = JSON.parse(fs.readFileSync(file, "utf8"));
const oldIds = new Set(readArr(liveFile).map((t) => t.id));
const rejectedIds = new Set(readArr(rejectedFile).map((r) => r.id));

const reasons = (t) => {
  if (oldIds.has(t.id)) return []; // веќе жив - не се допира, целосен или не

  const r = ["нов модел — чека преглед"];
  if (!t.size) r.push("нема големина");
  if (!t.image) r.push("нема слика");
  return r;
};

const bad = [];
const good = [];

for (const t of tvs) {
  if (rejectedIds.has(t.id)) continue; // админ веќе го одбил - не се враќа
  const r = reasons(t);
  if (r.length) bad.push({ tv: t, reasons: r });
  else good.push(t);
}

if (bad.length) {
  console.log("  на чекање: " + bad.length);
  for (const { tv, reasons: r } of bad.slice(0, 15)) {
    console.log("     " + tv.brand + " " + tv.model + "  (" + r.join(", ") + ")");
  }
  if (bad.length > 15) console.log("     ... и уште " + (bad.length - 15));

  fs.writeFileSync(
    process.argv[2],
    "# На чекање одобрување — " + new Date().toISOString().slice(0, 10) + "\n\n" +
    "Не одат на сајтот додека некој не ги довери во админ-панелот " +
    "(Чекаат одобрување).\n\n" +
    bad.map(({ tv, reasons: r }) =>
      "- " + tv.brand + " " + tv.model +
      " — " + r.join(", ") +
      " (" + Object.keys(tv.stores || {}).join(", ") + ")"
    ).join("\n") + "\n"
  );
} else {
  console.log("  нема нови модели оваа ноќ");
}

// --- опашка за чекање: спои со постоечката, без дупликати по id ---
let pending = readArr(pendingFile);
const badIds = new Set(bad.map((b) => b.tv.id));

// отстрани ги оние што веќе не се „нови" (одобрени/одбиени во меѓувреме,
// или трговецот веќе не ги нуди)
pending = pending.filter((p) => badIds.has(p.tv.id));

const pendingIds = new Set(pending.map((p) => p.tv.id));
const today = new Date().toISOString().slice(0, 10);

for (const b of bad) {
  const existing = pending.find((p) => p.tv.id === b.tv.id);
  if (existing) {
    // веќе чека - само освежи ги податоците/причините (трговецот можел да смени нешто)
    existing.tv = b.tv;
    existing.reasons = b.reasons;
  } else {
    pending.push({ tv: b.tv, reasons: b.reasons, discoveredAt: today });
  }
}

fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2) + "\n");

fs.writeFileSync(file, JSON.stringify(good, null, 2));
' "$CANDIDATE" "$REPORTS/odbieni-$(date +%F).md" "$LIVE/masterTvs.json" "$LIVE/pendingTvs.json" "$LIVE/rejectedTvs.json"

PENDING_TONIGHT=$(node -e "
try {
  const items = JSON.parse(require('fs').readFileSync('$LIVE/pendingTvs.json', 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  console.log(items.filter((p) => p.discoveredAt === today).length);
} catch { console.log(0); }
")

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

# ---------------------------------------------------------------
# Промоција: кандидатот станува жив.
#
# Прво осигурувач. Ако бројот на телевизори скокне или падне премногу,
# нешто е скршено (трговец ја сменил страницата, матчирањето пукнало) —
# тогаш НЕ се промовира, само се пријавува. Ова не е одобрување, туку
# заштита од катастрофа; нормалните дневни промени поминуваат сами.
# ---------------------------------------------------------------
echo
echo "--- промоција ---"

LIVE_COUNT=$(node -e "console.log(require('$LIVE/masterTvs.json').length)")
CAND_COUNT=$(node -e "console.log(require('$CANDIDATE').length)")
DIFF=$(( CAND_COUNT - LIVE_COUNT ))
ABS=${DIFF#-}
LIMIT=$(( LIVE_COUNT / 5 ))   # 20%

echo "  живо: $LIVE_COUNT   кандидат: $CAND_COUNT   разлика: $DIFF"

if [ "$ABS" -gt "$LIMIT" ]; then
  echo "  ❌ разликата е преголема (над $LIMIT) — НЕ промовирам."
  echo "     Кандидатот стои во $CANDIDATE за рачна проверка."
  FINAL_COUNT="$LIVE_COUNT"
  WARNINGS+=("Осигурувач: разлика од $DIFF (живо $LIVE_COUNT → кандидат $CAND_COUNT) е над дозволеното — НЕ промовирано")
  exit 1
fi

# Резервна копија пред менување; се чуваат последните 7.
BACKUP="$LIVE/masterTvs.auto-$(date +%F).json"
cp "$LIVE/masterTvs.json" "$BACKUP"
ls -t "$LIVE"/masterTvs.auto-*.json 2>/dev/null | tail -n +8 | xargs -r rm -f

cp "$CANDIDATE" "$LIVE/masterTvs.json"
# свежите списоци од трговците стануваат основа за следната ноќ
cp "$STAGING/src/Data/setecTvs.json" "$STAGING/src/Data/neptunTvs.json" \
   "$STAGING/src/Data/ddstoreTvs.json" "$LIVE/" 2>/dev/null || true

echo "  ✓ промовирано (резерва: $(basename "$BACKUP"))"
PROMOTED="да"
FINAL_COUNT="$CAND_COUNT"

# ---------------------------------------------------------------
# Во базата и кај API-то. Сајтот ги чита од API, па нема потреба од
# ново градење на фронтендот — новите телевизори се појавуваат веднаш.
# ---------------------------------------------------------------
echo
echo "--- база и API ---"
( cd "$ROOT/server" && node import.js 2>&1 | grep -vE "ExperimentalWarning|trace-warnings" | sed 's/^/  /' )
chown -R displaymk:displaymk "$ROOT" 2>/dev/null || true
systemctl restart display-mk-api
sleep 3
API_STATUS=$(systemctl is-active display-mk-api)
API_HEALTH=$(curl -sS -m 10 http://127.0.0.1:3001/api/health)
echo "  API: $API_STATUS — $API_HEALTH"
if [ "$API_STATUS" != "active" ]; then
  WARNINGS+=("API-то не е активно по рестартирање: $API_STATUS")
fi

# ---------------------------------------------------------------
# Слики: скрапирачите (Neptun) ги симнуваат во $ROOT/public/images/, не во
# местото од каде nginx служи — тоа е /var/www/display.mk/, посебна копија
# што ја полни ./scripts/deploy.sh само при рачно објавување на фронтендот.
# Без ова, секоја нова слика симната ноќе е 404 на живиот сајт додека некој
# рачно не објави фронтенд. rsync -a со исти имиња само ги додава новите.
# ---------------------------------------------------------------
echo
echo "--- слики ---"
if [ -d "$ROOT/public/images" ] && [ -d "/var/www/display.mk/images" ]; then
  rsync -a "$ROOT/public/images/" "/var/www/display.mk/images/" 2>&1 | tail -3
  # Ноќното се пушта како root, па новите фајлови ќе бидат root-owned —
  # ./scripts/deploy.sh се поврзува како kiko и не може да ги презапише
  # туѓи фајлови. Без ова, следниот рачен deploy паѓа со „Permission denied".
  chown -R kiko:kiko /var/www/display.mk/images/ 2>/dev/null || true
  echo "  синхронизирано"
else
  echo "  ⚠ нема една од папките, прескокнато"
fi

echo
echo "=============================================="
echo "Готово — $(date '+%F %T')"
echo "Сајтот е ажуриран: $CAND_COUNT телевизори"
echo "Извештаи: $REPORTS"
echo "=============================================="
