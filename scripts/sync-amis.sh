#!/usr/bin/env bash
# sync-amis.sh
#
# 将本地 amis fork 的构建产物（lib/ esm/）同步到 pnpm 存储中对应的缓存目录，
# 并清除 Vite 预构建缓存，确保 dev/preview 服务器立即使用最新代码。
#
# 用法：
#   bash scripts/sync-amis.sh            # 只同步，不重新构建
#   bash scripts/sync-amis.sh --build    # 先构建再同步
#   bash scripts/sync-amis.sh --build amis-ui          # 只构建并同步 amis-ui
#   bash scripts/sync-amis.sh --build amis-ui amis-core # 构建并同步多个包
#
# 默认同步的包（所有带 lib/ esm/ 的 amis 包）：
#   amis  amis-core  amis-ui  amis-formula
#
# 依赖：bash, rsync（或 cp）, readlink（Git Bash / Linux / macOS 均支持）

set -euo pipefail

# ── 路径配置 ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# amis fork 根目录（可通过环境变量覆盖）
AMIS_ROOT="${AMIS_ROOT:-$(cd "$REPO_ROOT/../amis-react19" && pwd)}"

# 用于解析 pnpm store 路径的消费者包（含有最完整的 amis 依赖 symlink）
CONSUMER_PKG="$REPO_ROOT/packages/amis-react/node_modules"

# ── 需要同步的包列表 ─────────────────────────────────────────────────────────
ALL_PACKAGES=(amis amis-core amis-ui amis-formula)

# ── 参数解析 ─────────────────────────────────────────────────────────────────
BUILD=false
BUILD_TARGETS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)
      BUILD=true
      shift
      # 剩余参数全部视为要构建的包名
      while [[ $# -gt 0 && "$1" != --* ]]; do
        BUILD_TARGETS+=("$1")
        shift
      done
      ;;
    -h|--help)
      sed -n '3,20p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *)
      echo "未知参数: $1  （用 --help 查看用法）" >&2
      exit 1
      ;;
  esac
done

# 若 --build 没有指定具体包，则构建全部
if $BUILD && [[ ${#BUILD_TARGETS[@]} -eq 0 ]]; then
  BUILD_TARGETS=("${ALL_PACKAGES[@]}")
fi

# ── 工具函数 ─────────────────────────────────────────────────────────────────
info()    { echo "[sync-amis] $*"; }
success() { echo "[sync-amis] ✓ $*"; }
warn()    { echo "[sync-amis] ⚠ $*" >&2; }
die()     { echo "[sync-amis] ✗ $*" >&2; exit 1; }

# 跨平台 readlink -f（macOS 的 readlink 不支持 -f）
realpath_compat() {
  if command -v realpath &>/dev/null; then
    realpath "$1"
  else
    python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$1"
  fi
}

# 同步单个目录：src_dir → dst_dir（只覆盖/新增，不删除 store 中多出的文件）
#
# 不使用 --delete：amis 包的 lib/ 在源树里只包含 JS/TS 文件，而 pnpm store
# 中的 lib/ 还包含构建脚本生成的 CSS（如 lib/themes/cxd.css），这些文件不在
# 源树中，删掉它们会导致 Vite 构建失败。
sync_dir() {
  local src="$1" dst="$2"
  if [[ ! -d "$src" ]]; then
    warn "源目录不存在，跳过: $src"
    return
  fi
  mkdir -p "$dst"
  if command -v rsync &>/dev/null; then
    # 不带 --delete：只覆盖，不删除目标中多出的文件
    rsync -a "$src/" "$dst/"
  else
    cp -r "$src/." "$dst/"
  fi
}

# ── 1. 构建（可选） ───────────────────────────────────────────────────────────
if $BUILD; then
  for pkg in "${BUILD_TARGETS[@]}"; do
    pkg_dir="$AMIS_ROOT/packages/$pkg"
    [[ -d "$pkg_dir" ]] || die "找不到包目录: $pkg_dir"
    info "构建 $pkg ..."
    # 使用 npx cross-env + rollup 直接调用，避免依赖 pnpm recursive
    pkg_json="$pkg_dir/package.json"
    build_cmd="$(node -e "const p=require('$pkg_json'); console.log((p.scripts||{}).build||'')" 2>/dev/null || true)"
    if [[ -z "$build_cmd" ]]; then
      warn "$pkg 没有 build 脚本，跳过构建"
      continue
    fi
    (
      cd "$pkg_dir"
      # 将 cross-env / rollup 替换为 npx 调用，兼容未全局安装的环境
      normalized="${build_cmd//cross-env/npx cross-env}"
      normalized="${normalized//rollup /npx rollup }"
      # clean-dist 步骤单独执行（rimraf）
      if echo "$normalized" | grep -q "clean-dist"; then
        npx rimraf lib/** esm/** 2>/dev/null || true
        normalized="${normalized#*clean-dist && }"
        normalized="${normalized#npm run clean-dist && }"
      fi
      eval "$normalized"
    )
    success "$pkg 构建完成"
  done
fi

# ── 2. 同步 lib/ esm/ 到 pnpm store ─────────────────────────────────────────
info "开始同步到 pnpm store ..."

for pkg in "${ALL_PACKAGES[@]}"; do
  src_pkg="$AMIS_ROOT/packages/$pkg"

  # 找到 pnpm store 中对应的真实路径
  # 优先从 packages/amis-react/node_modules 读取 symlink；
  # 若不存在则尝试从 apps/main/node_modules 读取
  symlink_candidates=(
    "$CONSUMER_PKG/$pkg"
    "$REPO_ROOT/apps/main/node_modules/$pkg"
  )
  store_pkg=""
  for candidate in "${symlink_candidates[@]}"; do
    if [[ -L "$candidate" ]]; then
      store_pkg="$(realpath_compat "$candidate")"
      break
    elif [[ -d "$candidate" ]]; then
      store_pkg="$candidate"
      break
    fi
  done

  if [[ -z "$store_pkg" ]]; then
    warn "$pkg 在 pnpm store 中没有找到对应路径，跳过（先运行 pnpm install？）"
    continue
  fi

  info "同步 $pkg  →  $store_pkg"

  for subdir in lib esm; do
    if [[ -d "$src_pkg/$subdir" ]]; then
      sync_dir "$src_pkg/$subdir" "$store_pkg/$subdir"
      success "  $pkg/$subdir 已同步"
    fi
  done

  # amis 包的 lib/themes/*.css 和 lib/helper.css 是由 build.sh 从 amis-ui 复制
  # 而来的，amis 源树里没有这些文件。同步时手动补齐，避免 Vite 构建报错。
  if [[ "$pkg" == "amis" ]]; then
    amis_ui_src="$AMIS_ROOT/packages/amis-ui/lib"
    amis_lib_dst="$store_pkg/lib"
    if [[ -d "$amis_ui_src/themes" ]]; then
      mkdir -p "$amis_lib_dst/themes"
      cp -f "$amis_ui_src/themes/"*.css "$amis_lib_dst/themes/" 2>/dev/null || true
      success "  amis/lib/themes (from amis-ui) 已同步"
    fi
    if [[ -f "$amis_ui_src/helper.css" ]]; then
      cp -f "$amis_ui_src/helper.css" "$amis_lib_dst/helper.css"
      success "  amis/lib/helper.css (from amis-ui) 已同步"
    fi
  fi
done

# ── 3. 清除 Vite 预构建缓存 ───────────────────────────────────────────────────
info "清除 Vite 预构建缓存 ..."

vite_cache_count=0
while IFS= read -r -d '' cache_dir; do
  info "  删除 $cache_dir"
  rm -rf "$cache_dir"
  (( vite_cache_count++ )) || true
done < <(find "$REPO_ROOT/apps" -path "*/node_modules/.vite/deps" -print0 2>/dev/null)

if [[ $vite_cache_count -eq 0 ]]; then
  info "  （没有找到 Vite 缓存目录）"
else
  success "已清除 $vite_cache_count 个 Vite 缓存目录"
fi

# ── 完成 ──────────────────────────────────────────────────────────────────────
echo ""
success "同步完成。现在可以直接运行 pnpm dev / pnpm test:e2e。"
