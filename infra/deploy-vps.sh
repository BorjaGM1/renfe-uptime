#!/usr/bin/env bash
# Instala o actualiza el medidor en el VPS (HOST en infra/deploy.env). Con algún test en rojo no despliega.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f infra/deploy.env ] && . infra/deploy.env
: "${HOST:?falta HOST en infra/deploy.env}"
uv run --frozen pytest -q
ssh "$HOST" 'install -d -m 755 /opt/renfe-uptime /opt/renfe-uptime/app'  # rsync no crea los padres
rsync -a --delete --no-owner --no-group \
  --include='/pyproject.toml' --include='/uv.lock' --include='/.python-version' --include='/README.md' \
  --include='/src/***' --include='/infra/***' --exclude='__pycache__/' --exclude='*' \
  ./ "$HOST:/opt/renfe-uptime/app/"
ssh "$HOST" 'bash /opt/renfe-uptime/app/infra/vps-install.sh'
