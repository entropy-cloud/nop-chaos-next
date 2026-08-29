#!/bin/bash
# E2E server orchestration for the "extension development without host source"
# workflow (playwright.extension-dev.config.ts).
#
# Topology:
#   host build  -> vite preview (4175)    : the packaged host SPA (mock APIs)
#   extension   -> nop-extension-dev serve (4180) : built extension artifacts (CORS)
#   debug entry -> nop-extension-dev dev-in-host (4176) : proxies 4175 and
#                 injects window.__NOP_EXTENSIONS__ pointing at 4180
#
# The playwright spec browses http://127.0.0.1:4176 — exactly the loop an
# external extension developer runs without host source.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST_PORT=4175
ASSET_PORT=4180
PROXY_PORT=4176

HOST_URL="http://127.0.0.1:${HOST_PORT}"
ASSET_URL="http://127.0.0.1:${ASSET_PORT}"
PROXY_URL="http://127.0.0.1:${PROXY_PORT}"

cleanup() {
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait_for() {
  local url="$1"
  local tries=120
  while [ "$tries" -gt 0 ]; do
    if curl -sf -o /dev/null "$url"; then
      return 0
    fi
    tries=$((tries - 1))
    sleep 1
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

cd "$ROOT_DIR"

echo "[e2e-extension-dev] starting host preview on $HOST_URL"
VITE_MOCK_MEMORY_ONLY=true VITE_ENABLE_MOCK=true \
  pnpm --filter @nop-chaos/main exec vite preview --mode devtools-e2e \
  --host 127.0.0.1 --port "$HOST_PORT" --strictPort &
wait_for "$HOST_URL"

echo "[e2e-extension-dev] starting extension asset server on $ASSET_URL"
node packages/extension-dev/src/cli.mjs serve \
  --dir examples/extension-demo/dist --port "$ASSET_PORT" --host 127.0.0.1 &
wait_for "$ASSET_URL/assets/index.js"

echo "[e2e-extension-dev] starting dev-in-host proxy on $PROXY_URL"
node packages/extension-dev/src/cli.mjs dev-in-host \
  --backend "$HOST_URL" \
  --extension example-extension-demo="$ASSET_URL/assets/index.js" \
  --port "$PROXY_PORT" --host 127.0.0.1 &
wait_for "$PROXY_URL"

echo "[e2e-extension-dev] all servers up; waiting for shutdown signal"
wait