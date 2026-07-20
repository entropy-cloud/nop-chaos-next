#!/usr/bin/env bash
# sync-e2e-shared.sh
#
# Sync packages/e2e-shared/src to a target project directory.
# Generates/updates package.json and writes a version marker file.
# Preserves project-specific files already in the target (spec files, _helper.ts, etc.).
#
# Usage:
#   bash scripts/sync-e2e-shared.sh <target-directory>
#
# Idempotent: running twice produces the same result.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DIR="$REPO_ROOT/packages/e2e-shared"
SOURCE_SRC_DIR="$SOURCE_DIR/src"

info()    { echo "[sync-e2e-shared] $*"; }
success() { echo "[sync-e2e-shared] OK: $*"; }
die()     { echo "[sync-e2e-shared] ERROR: $*" >&2; exit 1; }

# ── Argument parsing ────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <target-directory>" >&2
  echo "" >&2
  echo "Syncs packages/e2e-shared/src to the specified target directory." >&2
  exit 1
fi

TARGET_DIR="$1"
TARGET_SRC_DIR="$TARGET_DIR/src"

# ── Validation ──────────────────────────────────────────────────────
[[ -d "$SOURCE_SRC_DIR" ]] || die "Source not found: $SOURCE_SRC_DIR"

mkdir -p "$TARGET_SRC_DIR"

if [[ ! -w "$TARGET_DIR" ]]; then
  die "Target directory not writable: $TARGET_DIR"
fi

# ── Copy src/ to target/src/ ────────────────────────────────────────
info "Copying $SOURCE_SRC_DIR → $TARGET_SRC_DIR"

if command -v rsync &>/dev/null; then
  rsync -a --exclude node_modules "$SOURCE_SRC_DIR/" "$TARGET_SRC_DIR/"
else
  cp -R "$SOURCE_SRC_DIR/." "$TARGET_SRC_DIR/"
fi

COPY_COUNT=$(find "$TARGET_SRC_DIR" -type f | wc -l | tr -d ' ')

# ── Version marker ──────────────────────────────────────────────────
VERSION="$(node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('$SOURCE_DIR/package.json', 'utf8'));
  console.log(pkg.version);
")"

echo "$VERSION" > "$TARGET_DIR/e2e-shared-version.txt"

# ── Package manifest ────────────────────────────────────────────────
TARGET_PKG="$TARGET_DIR/package.json"

if [[ -f "$TARGET_PKG" ]]; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$TARGET_PKG', 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['@nop-chaos/e2e-shared'] = 'file:$SOURCE_DIR';
    fs.writeFileSync('$TARGET_PKG', JSON.stringify(pkg, null, 2) + '\n');
  "
  info "Updated existing $TARGET_PKG"
else
  cat > "$TARGET_PKG" <<EOF
{
  "name": "e2e-shared-target",
  "private": true,
  "type": "module",
  "dependencies": {
    "@nop-chaos/e2e-shared": "file:$SOURCE_DIR"
  }
}
EOF
  info "Created $TARGET_PKG"
fi

# ── Summary ─────────────────────────────────────────────────────────
success "Sync complete — $COPY_COUNT files in $TARGET_SRC_DIR"
success "Version marker written — $TARGET_DIR/e2e-shared-version.txt ($VERSION)"
