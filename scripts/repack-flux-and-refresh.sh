#!/usr/bin/env bash
#
# repack-flux-and-refresh.sh
#
# Flux-only 一键刷新：在上游 nop-chaos-flux 重新打包 @nop-chaos/flux，
# 把 tgz 拷贝到 libs/，同步 ui/theme-tokens/tailwind-preset 源码基线，
# 再仅刷新 flux 的 file 依赖缓存（不触碰 amis，无需 amis tgz 在场）。
#
# 与 repack-upstreams-and-refresh.sh 的区别：本脚本只处理 flux，amis 很少
# 更新，单独走 flux 流程更轻量。
#
# 用法：
#   bash scripts/repack-flux-and-refresh.sh                # 使用默认上游 ../nop-chaos-flux
#   FLUX_ROOT=/path/to/nop-chaos-flux bash scripts/repack-flux-and-refresh.sh
#
# 对应 package.json：pnpm refresh:flux

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_FLUX_ROOT="$REPO_ROOT/../nop-chaos-flux"
FLUX_ROOT="${FLUX_ROOT:-$DEFAULT_FLUX_ROOT}"

info() {
  echo "[repack-flux] $*"
}

success() {
  echo "[repack-flux] OK: $*"
}

die() {
  echo "[repack-flux] ERROR: $*" >&2
  exit 1
}

[[ -d "$FLUX_ROOT" ]] || die "nop-chaos-flux not found at $FLUX_ROOT"
[[ -f "$FLUX_ROOT/package.json" ]] || die "nop-chaos-flux package.json missing at $FLUX_ROOT"
[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"

# 1. 在上游打包并拷贝 tgz 到 libs/
info "Importing Flux tarball into libs/ (pack @nop-chaos/flux bundle)"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/import-flux-to-libs.sh)

# 2. 同步 ui / theme-tokens / tailwind-preset 源码基线（内部会 install 并构建这三个包）
info "Syncing Flux workspace packages (ui, theme-tokens, tailwind-preset)"
(cd "$REPO_ROOT" && FLUX_ROOT="$FLUX_ROOT" bash scripts/sync-flux-lib.sh)

# 3. 清除 pnpm store 中的旧缓存及 node_modules 中的旧解包，强制 pnpm 重新解析
info "Clearing pnpm store cache for @nop-chaos/flux"
STORE_DIR="$(cd "$REPO_ROOT" && pnpm store path)"
rm -rf "$STORE_DIR/file+libs+nop-chaos-flux-0.1.0.tgz"
rm -rf "$REPO_ROOT/apps/main/node_modules/@nop-chaos/flux"
rm -rf "$REPO_ROOT/node_modules/.pnpm/@nop-chaos+flux@file+libs+nop-chaos-flux-0.1.0.tgz"*

# 4. 重新安装（会重新拷贝 tarball 到 store 并解包）
info "Reinstalling @nop-chaos/flux from libs/"
(cd "$REPO_ROOT/apps/main" && pnpm add "@nop-chaos/flux@file:../../libs/nop-chaos-flux-0.1.0.tgz" --save-exact)

success "Done"
