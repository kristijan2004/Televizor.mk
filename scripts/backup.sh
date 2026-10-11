#!/usr/bin/env bash
#
# Резервна копија на податоците на серверот.
#
# Најважна е priceHistory.jsonl: таа расте секоја ноќ и НЕ МОЖЕ да се
# врати ако се изгуби — цените од минатата недела ги нема никаде на друго
# место. Останатото (masterTvs.json, базата, списоците од трговците) може
# да се изгради одново, но е побрзо да се врати од копија.
#
# Се пушта од cron по ноќното скрапирање. Рачно:
#   bash /opt/display-mk/scripts/backup.sh

set -euo pipefail

ROOT="/opt/display-mk"
DEST="$ROOT/backups"
KEEP=14
STAMP=$(date +%F)

mkdir -p "$DEST"

cd "$ROOT"

tar -czf "$DEST/display-mk-$STAMP.tar.gz" \
  --exclude="*.auto-*.json" \
  src/Data/masterTvs.json \
  src/Data/master-tvs.json \
  src/Data/priceHistory.jsonl \
  src/Data/priceSnapshot.json \
  src/Data/anhochTvs.json \
  src/Data/setecTvs.json \
  src/Data/neptunTvs.json \
  src/Data/ddstoreTvs.json \
  server/display.db \
  2>/dev/null

# Се чуваат последните KEEP; постарите се бришат.
ls -t "$DEST"/display-mk-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

SIZE=$(stat -c%s "$DEST/display-mk-$STAMP.tar.gz")
COUNT=$(ls "$DEST"/display-mk-*.tar.gz 2>/dev/null | wc -l)

echo "Копија: $DEST/display-mk-$STAMP.tar.gz ($((SIZE / 1024)) KB)"
echo "Се чуваат $COUNT копии (последните $KEEP дена)"
echo
echo "ВНИМАНИЕ: ова е на ИСТИОТ сервер. Ако дискот пропадне, нема копија."
echo "За копија надвор од серверот пушти локално: ./scripts/pull-data.sh"
