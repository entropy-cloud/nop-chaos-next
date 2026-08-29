#!/bin/bash
# Publish all SDK tarballs (dist/sdks/*.tgz) to the local verdaccio registry.
#
# Prerequisites:
#   - verdaccio running: pnpm dlx verdaccio --config tools/verdaccio/config.yaml
#   - tarballs built:    node tools/pack-sdks.mjs
#
# No interactive login needed — the script registers a machine user via the
# couchdb user endpoint and uses the returned bearer token for publishing.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REGISTRY="${NOP_SDK_REGISTRY:-http://127.0.0.1:4873}"
SDK_DIR="$ROOT_DIR/dist/sdks"

if [ ! -d "$SDK_DIR" ] || [ -z "$(ls "$SDK_DIR"/*.tgz 2>/dev/null)" ]; then
  echo "No tarballs in $SDK_DIR — run 'node tools/pack-sdks.mjs' first." >&2
  exit 1
fi

REGISTRY_HOST="$(node -e "console.log(new URL('$REGISTRY').host)")"

# 1) Register a machine user and capture the token (idempotent: re-register
#    returns ok for existing users with correct password).
TOKEN_RESPONSE="$(curl -sf -X PUT "$REGISTRY/-/user/org.couchdb.user:nop-ci" \
  -H 'Content-Type: application/json' \
  -d '{"name":"nop-ci","password":"nop-ci","email":"nop-ci@local","type":"user","roles":[],"date":"2026-01-01T00:00:00.000Z"}')" || {
  echo "Failed to register user against $REGISTRY — is verdaccio running?" >&2
  exit 1
}

TOKEN="$(printf '%s' "$TOKEN_RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const t=JSON.parse(d).token;if(!t){console.error(d);process.exit(1)}console.log(t)})")"

echo "Publishing tarballs from $SDK_DIR to $REGISTRY ..."
for tgz in "$SDK_DIR"/*.tgz; do
  echo "  -> $(basename "$tgz")"
  npm publish "$tgz" --registry "$REGISTRY" "--//$REGISTRY_HOST/:_authToken=$TOKEN" --access public
done

echo "Done. Install from the registry with:"
echo "  pnpm add @nop-chaos/shared@0.1.0 --registry $REGISTRY"