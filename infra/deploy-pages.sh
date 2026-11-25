#!/usr/bin/env bash
# Publica la página en el proyecto de Pages renfe-uptime (https://renfe.borjagm1.com). No sube web/ tal cual:
# infra/build-page.py monta una copia sin los casos de prueba y con la versión en las direcciones.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f infra/deploy.env ] && . infra/deploy.env
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?falta CLOUDFLARE_ACCOUNT_ID en infra/deploy.env}"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
python3 infra/build-page.py web "$out"
npx --yes wrangler@4.167.0 pages deploy "$out" --project-name renfe-uptime --branch main --commit-dirty=true
