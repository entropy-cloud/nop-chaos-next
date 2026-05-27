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

[[ -d "$AMIS_ROOT" ]] || die "amis-react19 not found at $AMIS_ROOT"
[[ -d "$FLUX_ROOT" ]] || die "nop-chaos-flux not found at $FLUX_ROOT"
[[ -f "$AMIS_ROOT/package.json" ]] || die "amis-react19 package.json missing at $AMIS_ROOT"
[[ -f "$FLUX_ROOT/package.json" ]] || die "nop-chaos-flux package.json missing at $FLUX_ROOT"
[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"

refresh_file_tarball_lock() {
  local workdir="$1"
  local dependency="$2"
  local spec="$3"

  info "Refreshing lockfile entry in ${workdir#$REPO_ROOT/} for $dependency"
  (cd "$workdir" && pnpm add "$dependency@$spec" --save-exact --lockfile-only)
  restore_dependency_spec "$workdir/package.json" "$dependency" "$spec"
}

drop_virtual_store_entry() {
  local pattern="$1"
  local matched=0

  shopt -s nullglob
  for dir in "$REPO_ROOT"/node_modules/.pnpm/$pattern; do
    matched=1
    info "Removing stale virtual store entry ${dir#$REPO_ROOT/}"
    rm -rf "$dir"
  done
  shopt -u nullglob

  if [[ "$matched" -eq 0 ]]; then
    info "No virtual store entries matched $pattern"
  fi
}

restore_dependency_spec() {
  local package_json="$1"
  local dependency="$2"
  local spec="$3"

  DEPENDENCY_NAME="$dependency" DEPENDENCY_SPEC="$spec" perl -0pi -e 's/("\Q$ENV{DEPENDENCY_NAME}\E"\s*:\s*")[^"]+(")/$1 . $ENV{DEPENDENCY_SPEC} . $2/ge' "$package_json"
}

info "Repacking AMIS tarballs"
(cd "$AMIS_ROOT" && npm run pack:nop-chaos)

info "Rebuilding Flux UI and packing @nop-chaos/flux"
(cd "$FLUX_ROOT" && pnpm --filter @nop-chaos/ui build && pnpm pack:flux-bundle)

info "Syncing Flux workspace packages into nop-chaos-next"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/sync-flux-lib.sh)

refresh_file_tarball_lock "$REPO_ROOT/apps/main" "@nop-chaos/flux" "file:../../../nop-chaos-flux/dist-packages/nop-chaos-flux-0.1.0.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis" "file:../../../amis-react19/dist-packages/amis-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-core" "file:../../../amis-react19/dist-packages/amis-core-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-formula" "file:../../../amis-react19/dist-packages/amis-formula-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "amis-ui" "file:../../../amis-react19/dist-packages/amis-ui-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/apps/main" "office-viewer" "file:../../../amis-react19/dist-packages/office-viewer-0.3.14.tgz"

refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis" "file:../../../amis-react19/dist-packages/amis-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-core" "file:../../../amis-react19/dist-packages/amis-core-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-formula" "file:../../../amis-react19/dist-packages/amis-formula-6.13.1.tgz"
refresh_file_tarball_lock "$REPO_ROOT/packages/amis-react" "amis-ui" "file:../../../amis-react19/dist-packages/amis-ui-6.13.1.tgz"

info "Dropping stale virtual store entries for refreshed file tarballs"
drop_virtual_store_entry 'amis-ui@file*'
drop_virtual_store_entry 'amis@file*'
drop_virtual_store_entry 'amis-core@file*'
drop_virtual_store_entry 'amis-formula@file*'
drop_virtual_store_entry 'office-viewer@file*'
drop_virtual_store_entry '@nop-chaos+flux@file*'

info "Refreshing nop-chaos-next file dependencies"
(cd "$REPO_ROOT" && pnpm install --force --config.confirmModulesPurge=false)

info "Done"
