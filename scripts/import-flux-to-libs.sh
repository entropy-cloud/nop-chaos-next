#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_FLUX_ROOT="$REPO_ROOT/../nop-chaos-flux"
FLUX_ROOT="${FLUX_ROOT:-$DEFAULT_FLUX_ROOT}"
LIBS_DIR="$REPO_ROOT/libs"

info() {
  echo "[import-flux-to-libs] $*"
}

die() {
  echo "[import-flux-to-libs] ERROR: $*" >&2
  exit 1
}

[[ -d "$FLUX_ROOT" ]] || die "nop-chaos-flux not found at $FLUX_ROOT"
[[ -f "$FLUX_ROOT/package.json" ]] || die "nop-chaos-flux package.json missing at $FLUX_ROOT"

mkdir -p "$LIBS_DIR"

info "Building Flux UI and packing @nop-chaos/flux"
(cd "$FLUX_ROOT" && pnpm --filter @nop-chaos/ui build && pnpm pack:flux-bundle)

[[ -f "$FLUX_ROOT/dist-packages/nop-chaos-flux-0.1.0.tgz" ]] || die "missing Flux tarball"
cp -f "$FLUX_ROOT/dist-packages/nop-chaos-flux-0.1.0.tgz" "$LIBS_DIR/nop-chaos-flux-0.1.0.tgz"

info "Copied nop-chaos-flux-0.1.0.tgz to libs/"
info "Done"
