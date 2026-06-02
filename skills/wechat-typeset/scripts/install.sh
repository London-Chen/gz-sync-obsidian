#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js >=20 is required." >&2
  exit 1
fi
npm install
npm run build
node dist/src/cli.js config init
printf '\nInstalled gz_sync. Fill config.local.json, then run:\n  node dist/src/cli.js config validate\n'
