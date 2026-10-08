#!/usr/bin/env bash
# Builds the site and copies it to the server.
#
#   ./scripts/deploy.sh
#
# Nothing on the server is built: the bundle is made here and only the
# finished files are sent, so a broken build never reaches display.mk.

set -euo pipefail

SERVER="${DISPLAY_MK_SERVER:-kiko@159.195.5.43}"
REMOTE_DIR="/var/www/display.mk"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "→ Градам..."
CI=false npm run build

if [ ! -f build/index.html ]; then
  echo "✗ build/index.html не постои — градењето не успеа" >&2
  exit 1
fi

echo
echo "→ Качувам на $SERVER:$REMOTE_DIR"
# --delete removes files on the server that no longer exist in the build,
# so old hashed bundles do not pile up forever.
rsync -az --delete --info=stats1 \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=15" \
  build/ "$SERVER:$REMOTE_DIR/"

echo
echo "→ Проверувам..."
CODE=$(curl -sS -m 20 --resolve display.mk:80:"${SERVER#*@}" \
  -o /dev/null -w "%{http_code}" http://display.mk/ || echo "000")

if [ "$CODE" = "200" ]; then
  echo "✓ Готово — display.mk враќа HTTP 200"
else
  echo "✗ display.mk враќа HTTP $CODE" >&2
  exit 1
fi
