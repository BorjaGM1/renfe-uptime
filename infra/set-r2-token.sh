#!/usr/bin/env bash
# Pide aquí la clave de R2 (el secreto, sin eco), la escribe en /etc/renfe-uptime.env del VPS (modo 600)
# y lanza una ronda para comprobar que sube. El token se crea en el panel de R2 con «Object Read & Write»
# solo sobre el bucket renfe-uptime (ver infra/cloudflare/README.md). La clave no pasa por el chat ni queda en el historial.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f infra/deploy.env ] && . infra/deploy.env
: "${HOST:?falta HOST en infra/deploy.env}" "${CLOUDFLARE_ACCOUNT_ID:?falta CLOUDFLARE_ACCOUNT_ID en infra/deploy.env}"
read -rp "R2 Access Key ID: " KEY
read -rsp "R2 Secret Access Key: " SECRET; echo
printf 'R2_ACCOUNT_ID=%s\nR2_BUCKET=renfe-uptime\nR2_ACCESS_KEY_ID=%s\nR2_SECRET_ACCESS_KEY=%s\n' \
  "$CLOUDFLARE_ACCOUNT_ID" "$KEY" "$SECRET" | ssh "$HOST" 'umask 077 && cat > /etc/renfe-uptime.env.new &&
    chown renfe-uptime:renfe-uptime /etc/renfe-uptime.env.new && mv /etc/renfe-uptime.env.new /etc/renfe-uptime.env &&
    systemctl start renfe-uptime.service && journalctl -u renfe-uptime.service -n 1 --no-pager -o cat'
