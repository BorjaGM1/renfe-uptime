#!/usr/bin/env bash
# Parte remota de deploy-vps.sh: se ejecuta como root en el VPS con el código ya copiado en /opt/renfe-uptime/app.
# Idempotente: instala la primera vez y actualiza las siguientes. Los datos (data/) y el token no se tocan.
set -euo pipefail
BASE=/opt/renfe-uptime
UV_VERSION=0.10.10

id renfe-uptime >/dev/null 2>&1 ||
  useradd --system --home-dir "$BASE" --no-create-home --shell /usr/sbin/nologin renfe-uptime
install -d -o root -g root -m 755 "$BASE"  # el código es de root: el servicio solo escribe en data/ y site/
install -d -o renfe-uptime -g renfe-uptime "$BASE/data" "$BASE/site"

# uv fijado, en su propio entorno: instala exactamente lo que dice uv.lock (Renfe CLI en su commit).
if [ "$("$BASE/tools/bin/uv" --version 2>/dev/null | cut -d' ' -f2)" != "$UV_VERSION" ]; then
  python3 -m venv "$BASE/tools"
  "$BASE/tools/bin/pip" install --quiet "uv==$UV_VERSION"
fi
cd "$BASE/app"
UV_PROJECT_ENVIRONMENT="$BASE/.venv" UV_CACHE_DIR="$BASE/.uv-cache" UV_PYTHON_DOWNLOADS=never \
  "$BASE/tools/bin/uv" sync --frozen --no-dev --no-editable --reinstall-package renfe-uptime --quiet  # rsync conserva
  # las fechas de los ficheros, y sin --reinstall-package uv no vería el código nuevo

[ -f /etc/renfe-uptime.env ] ||
  install -m 600 -o renfe-uptime -g renfe-uptime infra/renfe-uptime.env.example /etc/renfe-uptime.env
install -m 644 infra/systemd/renfe-uptime.service infra/systemd/renfe-uptime.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --quiet --now renfe-uptime.timer
systemctl start renfe-uptime.service
journalctl -u renfe-uptime.service -n 1 --no-pager -o cat
