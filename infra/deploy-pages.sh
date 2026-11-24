#!/usr/bin/env bash
# Publica web/ en el proyecto de Pages renfe-uptime (https://renfe.borjagm1.com).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f infra/deploy.env ] && . infra/deploy.env
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?falta CLOUDFLARE_ACCOUNT_ID en infra/deploy.env}"
npx --yes wrangler@4.167.0 pages deploy web --project-name renfe-uptime --branch main --commit-dirty=true
