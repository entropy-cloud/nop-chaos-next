#!/bin/bash
# Build extension-demo and copy output to apps/main/dist/extension/extension-demo/
# This places the extension standalone build alongside the host dist so sync-site.sh
# picks it up when deploying to nop-web-site.
#
# Usage:
#   bash scripts/sync-extension-demo.sh            # build + sync
#   bash scripts/sync-extension-demo.sh --no-build  # sync only (assumes dist/ exists)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/examples/extension-demo"
TARGET="$ROOT_DIR/apps/main/dist/extension/extension-demo"

if [ "${1:-}" != "--no-build" ]; then
  echo "Building extension-demo..."
  cd "$EXTENSION_DIR"
  pnpm build
fi

echo "Syncing extension-demo to $TARGET ..."
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -rf "$EXTENSION_DIR/dist/." "$TARGET/"

echo "Done."
