#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

info() {
  echo "[refresh-libs-deps] $*"
}

die() {
  echo "[refresh-libs-deps] ERROR: $*" >&2
  exit 1
}

refresh_file_tarball_lock() {
  local workdir="$1"
  local dependency="$2"
  local spec="$3"

  info "Refreshing file dependency in ${workdir#$REPO_ROOT/} for $dependency"
  (cd "$workdir" && pnpm add "$dependency@$spec" --save-exact)
}

for package_file in \
  amis-6.13.1-fix.0.tgz \
  amis-core-6.13.1-fix.0.tgz \
  amis-formula-6.13.1-fix.0.tgz \
  amis-ui-6.13.1-fix.0.tgz \
  office-viewer-0.3.14.tgz \
  nop-chaos-flux-0.1.0.tgz; do
  [[ -f "$REPO_ROOT/libs/$package_file" ]] || die "missing libs/$package_file"
done

refresh_file_tarball_lock "$REPO_ROOT/apps/main" "@nop-chaos/flux" "file:../../libs/nop-chaos-flux-0.1.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis" "file:../../libs/amis-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-core" "file:../../libs/amis-core-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-formula" "file:../../libs/amis-formula-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-ui" "file:../../libs/amis-ui-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "office-viewer" "file:../../libs/office-viewer-0.3.14.tgz"

refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis" "file:../../libs/amis-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-core" "file:../../libs/amis-core-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-formula" "file:../../libs/amis-formula-6.13.1-fix.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-ui" "file:../../libs/amis-ui-6.13.1-fix.0.tgz"

info "Done"
