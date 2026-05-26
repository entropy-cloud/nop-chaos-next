#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_AMIS_ROOT="$REPO_ROOT/../amis-react19"
DEFAULT_FLUX_ROOT="$REPO_ROOT/../nop-chaos-flux"
AMIS_ROOT="${AMIS_ROOT:-$DEFAULT_AMIS_ROOT}"
FLUX_ROOT="${FLUX_ROOT:-$DEFAULT_FLUX_ROOT}"

info() {
  echo "[rebuild-amis-flux-and-build] $*"
}

die() {
  echo "[rebuild-amis-flux-and-build] ERROR: $*" >&2
  exit 1
}

[[ -d "$AMIS_ROOT" ]] || die "amis-react19 not found at $AMIS_ROOT"
[[ -d "$FLUX_ROOT" ]] || die "nop-chaos-flux not found at $FLUX_ROOT"
[[ -f "$AMIS_ROOT/package.json" ]] || die "amis-react19 package.json missing at $AMIS_ROOT"
[[ -f "$FLUX_ROOT/package.json" ]] || die "nop-chaos-flux package.json missing at $FLUX_ROOT"
[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"

info "Repacking AMIS tarballs"
(cd "$AMIS_ROOT" && npm run pack:nop-chaos)

info "Rebuilding Flux UI and packing @nop-chaos/flux"
(cd "$FLUX_ROOT" && pnpm --filter @nop-chaos/ui build && pnpm pack:flux-bundle)

info "Syncing Flux workspace packages into nop-chaos-next"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/sync-flux-lib.sh)

info "Building nop-chaos-next"
(cd "$REPO_ROOT" && pnpm build)

info "Done"
