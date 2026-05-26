#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_FLUX_ROOT="$REPO_ROOT/../nop-chaos-flux"
FLUX_ROOT="${FLUX_ROOT:-$DEFAULT_FLUX_ROOT}"
FLUX_PACKAGES_DIR="$FLUX_ROOT/packages"
FLUX_LOG_ROOT="$REPO_ROOT/docs/logs/flux-sync"

PACKAGES=("$@")

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  PACKAGES=(ui theme-tokens tailwind-preset)
fi

TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

info() {
  echo "[sync-flux-lib] $*"
}

success() {
  echo "[sync-flux-lib] OK: $*"
}

die() {
  echo "[sync-flux-lib] ERROR: $*" >&2
  exit 1
}

timestamp_utc() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

today_date() {
  date -u '+%Y-%m-%d'
}

today_year() {
  date -u '+%Y'
}

current_month_day() {
  date -u '+%m-%d'
}

current_month() {
  date -u '+%m'
}

joined_packages() {
  local joined=""
  local package_name

  for package_name in "$@"; do
    if [[ -n "$joined" ]]; then
      joined+=", "
    fi
    joined+="$package_name"
  done

  printf '%s' "$joined"
}

ensure_flux_log_file() {
  local year="$1"
  local month_day="$2"
  local year_dir="$FLUX_LOG_ROOT/$year"
  local log_file="$year_dir/$month_day.md"

  mkdir -p "$year_dir"

  if [[ ! -f "$log_file" ]]; then
    printf '# Flux Sync Log — %s-%s\n\n' "$year" "$month_day" > "$log_file"
  fi

  printf '%s' "$log_file"
}

record_sync_history() {
  local upstream_commit="$1"
  local sync_started_at="$2"
  local sync_finished_at="$3"
  local package_list="$4"
  local year
  local month_day
  local log_file

  year="$(today_year)"
  month_day="$(current_month_day)"
  log_file="$(ensure_flux_log_file "$year" "$month_day")"

  {
    printf '### %s\n\n' "$(today_date)"
    printf -- '- Upstream repo: `%s`\n' "$FLUX_ROOT"
    printf -- '- Upstream commit: `%s`\n' "$upstream_commit"
    printf -- '- Packages: `%s`\n' "$package_list"
    printf -- '- Started at (UTC): `%s`\n' "$sync_started_at"
    printf -- '- Finished at (UTC): `%s`\n' "$sync_finished_at"
    printf -- '- Sync script: `scripts/sync-flux-lib.sh`\n'
    printf -- '- Result: synced upstream sources, applied runtime-only package policy, refreshed install, rebuilt synced workspace packages\n\n'
  } >> "$log_file"

  success "Recorded sync history in $log_file"
}

package_filter() {
  case "$1" in
    ui)
      echo '@nop-chaos/ui'
      ;;
    theme-tokens)
      echo '@nop-chaos/theme-tokens'
      ;;
    tailwind-preset)
      echo '@nop-chaos/tailwind-preset'
      ;;
    *)
      die "Unsupported package for local build filter: $1"
      ;;
  esac
}

package_destination() {
  case "$1" in
    ui)
      echo "$REPO_ROOT/flux-lib/ui"
      ;;
    theme-tokens|tailwind-preset)
      echo "$REPO_ROOT/packages/$1"
      ;;
    *)
      echo "$REPO_ROOT/flux-lib/$1"
      ;;
  esac
}

copy_tree() {
  local src="$1"
  local dst="$2"

  rm -rf "$dst"
  mkdir -p "$dst"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude node_modules \
      --exclude .turbo \
      --exclude .vite \
      --exclude .cache \
      --exclude coverage \
      "$src/" "$dst/"
  else
    cp -R "$src/." "$dst/"
  fi
}

cleanup_patch_snapshot() {
  local dir="$1"

  rm -rf "$dir/node_modules" "$dir/.turbo" "$dir/.vite" "$dir/.cache" "$dir/coverage" "$dir/dist"
  rm -f "$dir/package.json"

  if [[ -d "$dir/src" ]]; then
    find "$dir/src" -type f \( -name '*.d.ts' -o -name '*.d.ts.map' \) -delete
    find "$dir/src" -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -delete
    find "$dir/src" -type d -name '__tests__' -prune -exec rm -rf {} +
  fi

  find "$dir" -type f -name '*.tsbuildinfo' -delete
}

cleanup_synced_tree() {
  local dir="$1"

  cleanup_patch_snapshot "$dir"

  if [[ -d "$dir/src" ]]; then
    find "$dir/src" -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -delete
    find "$dir/src" -type d -name '__tests__' -prune -exec rm -rf {} +
  fi
}

read_package_test_script() {
  local package_json="$1"

  node -e "
    const fs = require('node:fs');
    const path = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    const testScript = pkg.scripts && typeof pkg.scripts.test === 'string' ? pkg.scripts.test : '';
    process.stdout.write(testScript);
  " "$package_json"
}

runtime_only_test_script() {
  case "$1" in
    ui|theme-tokens|tailwind-preset)
      echo 'vitest run --passWithNoTests'
      ;;
    *)
      echo ''
      ;;
  esac
}

apply_package_json_policy() {
  local package_name="$1"
  local src="$2"
  local dst="$3"

  local upstream_package_json="$src/package.json"
  local downstream_package_json="$dst/package.json"
  local policy_test_script

  policy_test_script="$(runtime_only_test_script "$package_name")"

  cp "$upstream_package_json" "$downstream_package_json"

  if [[ -n "$policy_test_script" ]]; then
    info "Applying runtime-only test script policy for $package_name"
    node -e "
      const fs = require('node:fs');
      const path = process.argv[1];
      const testScript = process.argv[2];
      const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
      pkg.scripts = pkg.scripts || {};
      pkg.scripts.test = testScript;
      fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
    " "$downstream_package_json" "$policy_test_script"
  fi
}

sync_package() {
  local package_name="$1"
  local src="$FLUX_PACKAGES_DIR/$package_name"
  local dst

  [[ -d "$src" ]] || die "Source package not found: $src"
  [[ -f "$src/package.json" ]] || die "package.json missing: $src/package.json"

  dst="$(package_destination "$package_name")"

  info "Syncing $package_name"
  copy_tree "$src" "$dst"
  cleanup_synced_tree "$dst"
  apply_package_json_policy "$package_name" "$src" "$dst"
  success "$package_name synced to $dst"
}

[[ -d "$FLUX_ROOT" ]] || die "Flux project not found at $FLUX_ROOT"
[[ -d "$FLUX_PACKAGES_DIR" ]] || die "Flux packages directory not found: $FLUX_PACKAGES_DIR"
[[ -f "$REPO_ROOT/pnpm-workspace.yaml" ]] || die "Current repo root is invalid: $REPO_ROOT"

SYNC_STARTED_AT="$(timestamp_utc)"
UPSTREAM_COMMIT="$(git -C "$FLUX_ROOT" rev-parse HEAD 2>/dev/null)" || die "Failed to resolve Flux upstream commit"
PACKAGE_LIST="$(joined_packages "${PACKAGES[@]}")"

info "Flux source: $FLUX_ROOT"
info "Target repo: $REPO_ROOT"
info "Flux upstream commit: $UPSTREAM_COMMIT"

for package_name in "${PACKAGES[@]}"; do
  sync_package "$package_name"
done

info "Refreshing workspace install"
(cd "$REPO_ROOT" && pnpm install --config.confirmModulesPurge=false)

for package_name in "${PACKAGES[@]}"; do
  build_filter="$(package_filter "$package_name")"
  info "Building $build_filter"
  (cd "$REPO_ROOT" && pnpm --filter "$build_filter" build)
done

record_sync_history "$UPSTREAM_COMMIT" "$SYNC_STARTED_AT" "$(timestamp_utc)" "$PACKAGE_LIST"

success "Done"
