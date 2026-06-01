#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_AMIS_ROOT="$REPO_ROOT/../amis-react19"
AMIS_ROOT="${AMIS_ROOT:-$DEFAULT_AMIS_ROOT}"
LIBS_DIR="$REPO_ROOT/libs"

info() {
  echo "[import-amis-to-libs] $*"
}

die() {
  echo "[import-amis-to-libs] ERROR: $*" >&2
  exit 1
}

[[ -d "$AMIS_ROOT" ]] || die "amis-react19 not found at $AMIS_ROOT"
[[ -f "$AMIS_ROOT/package.json" ]] || die "amis-react19 package.json missing at $AMIS_ROOT"

mkdir -p "$LIBS_DIR"

info "Packing AMIS upstream tarballs"
(cd "$AMIS_ROOT" && npm run pack:nop-chaos)

for package_file in \
  amis-6.13.1.tgz \
  amis-core-6.13.1.tgz \
  amis-formula-6.13.1.tgz \
  amis-ui-6.13.1.tgz \
  office-viewer-0.3.14.tgz; do
  [[ -f "$AMIS_ROOT/dist-packages/$package_file" ]] || die "missing AMIS tarball: $AMIS_ROOT/dist-packages/$package_file"
  cp -f "$AMIS_ROOT/dist-packages/$package_file" "$LIBS_DIR/$package_file"
  info "Copied $package_file to libs/"
done

info "Done"
