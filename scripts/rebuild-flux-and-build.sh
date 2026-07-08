#!/usr/bin/env bash
#
# rebuild-flux-and-build.sh
#
# Flux-only 完整更新 + 构建：先刷新 flux（打包→拷贝→同步源码→刷新缓存），
# 再全量构建 nop-chaos-next。这是 flux 更新的最完整一键指令。
#
# 与 rebuild-amis-flux-and-build.sh 的区别：本脚本只处理 flux，不重新打包 amis。
#
# 用法：
#   bash scripts/rebuild-flux-and-build.sh
#   FLUX_ROOT=/path/to/nop-chaos-flux bash scripts/rebuild-flux-and-build.sh
#
# 对应 package.json：pnpm rebuild:flux:build

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

info() {
  echo "[rebuild-flux] $*"
}

die() {
  echo "[rebuild-flux] ERROR: $*" >&2
  exit 1
}

[[ -f "$REPO_ROOT/package.json" ]] || die "nop-chaos-next package.json missing at $REPO_ROOT"

info "Refreshing flux upstream artifacts and dependencies (flux-only)"
(cd "$REPO_ROOT" && bash scripts/repack-flux-and-refresh.sh)

info "Building nop-chaos-next"
(cd "$REPO_ROOT" && pnpm build)

info "Done"
