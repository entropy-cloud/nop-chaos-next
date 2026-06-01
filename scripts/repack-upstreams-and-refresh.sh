#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_AMIS_ROOT="$REPO_ROOT/../amis-react19"
DEFAULT_FLUX_ROOT="$REPO_ROOT/../nop-chaos-flux"
AMIS_ROOT="${AMIS_ROOT:-$DEFAULT_AMIS_ROOT}"
FLUX_ROOT="${FLUX_ROOT:-$DEFAULT_FLUX_ROOT}"

info() {
  echo "[repack-upstreams-and-refresh] $*"
}

die() {
  echo "[repack-upstreams-and-refresh] ERROR: $*" >&2
  exit 1
}

[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"
info "Importing AMIS tarballs into libs/"
(cd "$REPO_ROOT" && AMIS_ROOT="$AMIS_ROOT" bash scripts/import-amis-to-libs.sh)

info "Importing Flux tarball into libs/"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/import-flux-to-libs.sh)

info "Syncing Flux workspace packages into nop-chaos-next"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/sync-flux-lib.sh)

info "Refreshing nop-chaos-next file dependencies from libs/"
(cd "$REPO_ROOT" && bash scripts/refresh-libs-deps.sh)

info "Done"
