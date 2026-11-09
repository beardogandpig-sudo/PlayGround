#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

if [[ -f package-lock.json ]]; then
  /usr/bin/time -p npm ci --no-audit --no-fund
else
  /usr/bin/time -p npm install --no-audit --no-fund
fi
/usr/bin/time -p npm run build

: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to the worker metadata directory}"
/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
/usr/bin/time -p node --input-type=module -e 'import { writeFileSync } from "node:fs"; import { resolve } from "node:path"; writeFileSync(resolve(process.env.OPENCODE_WEB_DIR, "deployment-output.json"), JSON.stringify({ project: process.cwd(), directory: resolve("dist") }))'

exec /usr/bin/time -p npm run preview -- --host 0.0.0.0 --port "$PORT" --strictPort
