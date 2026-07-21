#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[ -d backend/node_modules ] && [ -d frontend/node_modules ] || { echo 'Dependencies missing; run ./scripts/bootstrap.sh.' >&2; exit 1; }
set -a; . ./.env; set +a
npm --prefix backend start & backend_pid=$!
npm --prefix frontend run dev -- --port "${FRONTEND_PORT:-5173}" & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }; trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
