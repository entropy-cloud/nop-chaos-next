#!/bin/bash
# Build extension-demo and copy output to apps/main/dist/extensions/example-extension-demo/
# This places the extension standalone build alongside the host dist so sync-site.sh
# picks it up when deploying to nop-web-site.
#
# Deployment layout (matches nop-web IndexHtmlProvider):
#   {extension.json.id} must equal the directory name under apps/main/dist/extensions/,
#   e.g. example-extension-demo -> apps/main/dist/extensions/example-extension-demo/
#   Spring/Quarkus serves META-INF/resources/extensions/** as /extensions/**
#
# Usage:
#   bash scripts/sync-extension-demo.sh            # build + sync
#   bash scripts/sync-extension-demo.sh --no-build  # sync only (assumes dist/ exists)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/examples/extension-demo"
EXTENSION_ID="example-extension-demo"
TARGET="$ROOT_DIR/apps/main/dist/extensions/$EXTENSION_ID"

if [ "${1:-}" != "--no-build" ]; then
  echo "Building extension-demo..."
  cd "$EXTENSION_DIR"
  pnpm build
fi

echo "Syncing extension-demo to $TARGET ..."
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -rf "$EXTENSION_DIR/dist/." "$TARGET/"

# 清理旧的单数 extension/ 布局（如果存在），避免与复数 extensions/ 同时存在造成歧义
OLD_TARGET="$ROOT_DIR/apps/main/dist/extension"
if [ -d "$OLD_TARGET" ]; then
  echo "Removing legacy single-extension layout: $OLD_TARGET"
  rm -rf "$OLD_TARGET"
fi

echo "Done."