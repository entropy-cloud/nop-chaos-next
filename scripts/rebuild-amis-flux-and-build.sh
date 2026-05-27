#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
info() {
  echo "[rebuild-amis-flux-and-build] $*"
}

die() {
  echo "[rebuild-amis-flux-and-build] ERROR: $*" >&2
  exit 1
}

[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"

info "Repacking upstream projects and refreshing dependencies"
(cd "$REPO_ROOT" && bash scripts/repack-upstreams-and-refresh.sh)

info "Building nop-chaos-next"
(cd "$REPO_ROOT" && pnpm build)

info "Done"
