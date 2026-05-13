#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FLUX_ROOT="${FLUX_ROOT:-$(cd "$REPO_ROOT/../nop-chaos-flux" && pwd)}"
FLUX_PACKAGES_DIR="$FLUX_ROOT/packages"

PACKAGES=("$@")

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  PACKAGES=(ui theme-tokens tailwind-preset)
fi

info() {
  echo "[sync-flux-lib] $*"
}

die() {
  echo "[sync-flux-lib] ERROR: $*" >&2
  exit 1
}

sync_package() {
  local package_name="$1"
  local src="$FLUX_PACKAGES_DIR/$package_name"
  local dst

  [[ -d "$src" ]] || die "Source package not found: $src"
  [[ -f "$src/package.json" ]] || die "package.json missing: $src/package.json"

  case "$package_name" in
    ui)
      dst="$REPO_ROOT/flux-lib/ui"
      ;;
    theme-tokens|tailwind-preset)
      dst="$REPO_ROOT/packages/$package_name"
      ;;
    *)
      dst="$REPO_ROOT/flux-lib/$package_name"
      ;;
  esac

  info "Syncing $package_name"
  rm -rf "$dst"
  cp -R "$src" "$dst"
  rm -rf "$dst/node_modules"
  rm -rf "$dst/.turbo"

  # Consumer workspace only needs runtime sources, not upstream test files.
  if [[ -d "$dst/src" ]]; then
    find "$dst/src" -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) -exec rm -f {} +
    find "$dst/src" -type d -name "__tests__" -exec rm -rf {} +
  fi
}

[[ -d "$FLUX_ROOT" ]] || die "Flux project not found at $FLUX_ROOT"
[[ -d "$FLUX_PACKAGES_DIR" ]] || die "Flux packages directory not found: $FLUX_PACKAGES_DIR"
[[ -f "$REPO_ROOT/pnpm-workspace.yaml" ]] || die "Current repo root is invalid: $REPO_ROOT"

info "Flux source: $FLUX_ROOT"
info "Target repo: $REPO_ROOT"

for package_name in "${PACKAGES[@]}"; do
  sync_package "$package_name"
done

info "Refreshing workspace install"
(cd "$REPO_ROOT" && pnpm install --config.confirmModulesPurge=false)

info "Done"
