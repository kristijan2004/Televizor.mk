#!/usr/bin/env bash
#
# Портите 80/443 да бидат отворени САМО за Cloudflare.
#
# Зошто: серверот беше достапен директно на својата IP адреса, што значи
# дека секој што ќе ја дознае можеше да го заобиколи Cloudflare целосно —
# без ограничување, без заштита од ботови. Полошо: заглавието
# CF-Connecting-IP (по кое се брои ограничувањето) можеше да се фалсификува,
# па секое лажно IP добиваше нов буџет.
#
# Кога само Cloudflare може да стигне до 80/443, тоа заглавие доаѓа само од
# нив и повеќе не може да се измисли.
#
# Списокот на адреси се менува ретко; скриптата може да се пушти повторно.

set -euo pipefail

echo "→ Ги земам адресите на Cloudflare..."
V4=$(curl -sS --fail -m 30 https://www.cloudflare.com/ips-v4)
V6=$(curl -sS --fail -m 30 https://www.cloudflare.com/ips-v6)

COUNT=$(printf "%s\n%s\n" "$V4" "$V6" | grep -c .)
if [ "$COUNT" -lt 10 ]; then
  echo "✗ Добив само $COUNT адреси — нешто не е во ред, не менувам ништо." >&2
  exit 1
fi
echo "  $COUNT опсези"

echo "→ Ги вадам старите правила за 80/443..."
while ufw status numbered | grep -qE "^\[[ 0-9]+\] (80|443)/tcp"; do
  NUM=$(ufw status numbered | grep -E "^\[[ 0-9]+\] (80|443)/tcp" | head -1 | sed -E "s/^\[ *([0-9]+)\].*/\1/")
  ufw --force delete "$NUM" >/dev/null
done

echo "→ Дозволувам само од Cloudflare..."
for CIDR in $V4 $V6; do
  ufw allow from "$CIDR" to any port 80 proto tcp comment "Cloudflare" >/dev/null
  ufw allow from "$CIDR" to any port 443 proto tcp comment "Cloudflare" >/dev/null
done

ufw reload >/dev/null
echo "  готово: $(ufw status | grep -c Cloudflare) правила"
echo
echo "SSH (22) останува отворен — не се заклучуваме."
ufw status | grep -E "^22/tcp" | sed 's/^/  /'
