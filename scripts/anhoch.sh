#!/usr/bin/env bash
#
# Го чита Anhoch ОД ДОМА и го праќа резултатот на серверот.
#
# Зошто рачно: Anhoch е зад Cloudflare challenge што ги блокира серверските
# IP адреси. Од домашна врска поминува, од серверот враќа 403. Другите три
# трговци се читаат сами секоја ноќ на серверот.
#
#   ./scripts/anhoch.sh            # чита и прашува пред да качи
#   ./scripts/anhoch.sh --upload   # чита и качува без прашање

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="${DISPLAY_MK_SERVER:-root@159.195.5.43}"
SCRATCH="$ROOT/src/data/anhochTvs.json"
LIVE="$ROOT/src/Data/anhochTvs.json"
MIN=60

cd "$ROOT"

echo "→ Го читам Anhoch (од твојата врска, не од серверот)..."
node scripts/scrapeAnhoch.js

if [ ! -f "$SCRATCH" ]; then
  echo "✗ Нема $SCRATCH — скриптата не запиша ништо" >&2
  exit 1
fi

COUNT=$(node -e "console.log(require('$SCRATCH').length)")
OLD=$(node -e "try{console.log(require('$LIVE').length)}catch(e){console.log(0)}")

echo
echo "  прочитани : $COUNT производи"
echo "  претходно : $OLD"

if [ "$COUNT" -lt "$MIN" ]; then
  echo "✗ Премалку производи ($COUNT < $MIN) — нешто е скршено, не качувам." >&2
  echo "  Старите податоци остануваат недопрени." >&2
  exit 1
fi

if [ "${1:-}" != "--upload" ]; then
  echo
  read -r -p "Да ги зачувам и качам на серверот? [d/N] " ANSWER
  case "$ANSWER" in
    d|D|y|Y|da|DA) ;;
    *) echo "Откажано. Прочитаното стои во $SCRATCH"; exit 0 ;;
  esac
fi

cp "$SCRATCH" "$LIVE"
echo "→ Зачувано во src/Data/anhochTvs.json"

rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=15" \
  "$LIVE" "$SERVER:/opt/display-mk/src/Data/anhochTvs.json"
echo "→ Качено на серверот — ноќното скрапирање ќе го користи ова"
echo
echo "Готово. Anhoch е свеж; другите три се читаат сами во 03:30."
