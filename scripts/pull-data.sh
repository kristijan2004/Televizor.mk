#!/usr/bin/env bash
#
# Ги симнува податоците од серверот во локалниот проект.
#
# Зошто: серверот е единственото место каде живее историјата на цените, а
# таа не може да се врати наназад. Со ова таа влегува во git, значи и на
# GitHub — вистинска копија надвор од серверот.
#
#   ./scripts/pull-data.sh
#
# Потоа: git add -A && git commit && git push

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="${DISPLAY_MK_SERVER:-root@159.195.5.43}"

cd "$ROOT"

echo "→ Симнувам од серверот..."
rsync -az --info=stats1 -e "ssh -o BatchMode=yes -o ConnectTimeout=15" \
  "$SERVER:/opt/display-mk/src/Data/priceHistory.jsonl" \
  "$SERVER:/opt/display-mk/src/Data/priceSnapshot.json" \
  "$SERVER:/opt/display-mk/src/Data/masterTvs.json" \
  src/Data/ 2>&1 | tail -3

echo
echo "→ Состојба:"
printf "  masterTvs.json     %s телевизори\n" "$(node -e "console.log(require('$ROOT/src/Data/masterTvs.json').length)")"
printf "  priceHistory.jsonl %s реда\n" "$(wc -l < src/Data/priceHistory.jsonl)"

echo
if git diff --quiet src/Data/ 2>/dev/null; then
  echo "Нема промени — локалното е исто како на серверот."
else
  echo "Има промени. За копија надвор од серверот:"
  echo "  git add src/Data && git commit -m 'Податоци од серверот' && git push"
fi
