#!/usr/bin/env bash
#
# Ги симнува извештаите од ноќното скрапирање на серверот.
#
#   ./scripts/reports.sh          # последните извештаи + краток преглед
#   ./scripts/reports.sh --all    # сите

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="${DISPLAY_MK_SERVER:-root@159.195.5.43}"

mkdir -p "$ROOT/reports"

echo "→ Симнувам извештаи од серверот..."
rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=15" \
  "$SERVER:/opt/display-mk/reports/" "$ROOT/reports/"

echo
echo "=== Последни извештаи ==="
ls -t "$ROOT/reports"/*.md 2>/dev/null | head -4 | while read -r F; do
  printf "  %s\n" "$(basename "$F")"
done

LATEST_PRICE=$(ls -t "$ROOT/reports"/price-changes-*.md 2>/dev/null | head -1 || true)
if [ -n "$LATEST_PRICE" ]; then
  echo
  echo "=== $(basename "$LATEST_PRICE") ==="
  head -5 "$LATEST_PRICE" | sed 's/^/  /'
fi

LATEST_NEW=$(ls -t "$ROOT/reports"/new-tvs-*.md 2>/dev/null | head -1 || true)
if [ -n "$LATEST_NEW" ]; then
  echo
  echo "=== $(basename "$LATEST_NEW") ==="
  grep -E "^### Нови|^- \*\*" "$LATEST_NEW" | head -12 | sed 's/^/  /'
fi

echo
echo "Сите извештаи се во: reports/"
