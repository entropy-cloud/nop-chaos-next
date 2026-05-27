# 24 Main Bundle Chunk Boundary Regression

## Problem

- `apps/main` 的延迟加载表面上已经使用了 `React.lazy`，但构建产物中仍出现 `page` chunk 被其他 `page` chunk 复用的情况。
- 同时，`@nop-chaos/ui` 实际来自 `flux-lib/ui`，若拆包规则漏掉该工作区根，基础依赖会被错误吸进 host 或页面 chunk。
- 结果是 AMIS 与宿主共享依赖关系被扭曲，出现类似“AMIS 依赖主框架”的反向 chunk 关系风险。

## Diagnostic Method

- 先检查 `apps/main/vite.config.ts` 的 `manualChunks`，确认包识别只覆盖了 `/packages/`，没有覆盖 `flux-lib/`。
- 再构建 `apps/main` 并检查现有分析脚本输出，发现旧脚本几乎没有识别出真实 chunk imports。
- 直接读取 `dist/assets/*.js` 后确认压缩产物使用了 `import{...}from "./x.js"` 语法，旧正则漏掉了这种形式，导致分析结果失真。
- 在修正 chunk import 分析后，明确观察到 `page-used-as-shared-runtime`：多个页面 chunk 反向复用了其他页面 chunk。

## Root Cause

- `manualChunks` 的“workspace 包识别”只匹配 `/packages/`，漏掉了 `flux-lib/ui`，使 `@nop-chaos/ui` 不能稳定落到基础层 chunk。
- 宿主的共享组件目录（如 `apps/main/src/components/common`）没有被收口到 host 共享层，导致页面 chunk 先吞掉了公共组件，再被其他页面反向依赖。
- 旧的构建后分析脚本无法正确解析压缩产物 import，导致这类问题之前没有被可靠阻止。

## Fix

- 新增 `scripts/main-bundle-utils.mjs`，统一识别 `apps/*`、`packages/*`、`examples/*`、`flux-lib/*` 四类工作区根，并按包名生成稳定 chunk 名。
- 新增 `scripts/analyze-main-package-graph.mjs` 与 `scripts/analyze-main-chunk-graph.mjs`，分别校验源码依赖图与构建后 chunk 图。
- 在 `apps/main/vite.config.ts` 中改为先按“文件所属包”决定 chunk，再按宿主目录决定 host/page 分层，并将 `src/components/common` 纳入 host 共享层。
- 将分析脚本接入 `apps/main build` 与 `build:analyze`，把问题变成构建门禁而不是事后人工观察。

## Tests

- `scripts/analyze-main-package-graph.mjs` - 校验 workspace 包依赖层级、循环依赖、跨包深层导入、未声明依赖。
- `scripts/analyze-main-chunk-graph.mjs` - 校验构建产物的 chunk cycles、反向层级依赖、`page-used-as-shared-runtime`。

## Affected Files

- `apps/main/vite.config.ts`
- `apps/main/package.json`
- `scripts/main-bundle-utils.mjs`
- `scripts/analyze-main-package-graph.mjs`
- `scripts/analyze-main-chunk-graph.mjs`
- `scripts/ensure-amis-file-deps-built.mjs`
- `docs/design/main-bundle-dependency-spec.md`
- `docs/skills/main-bundle-dependency-governance.md`

## Documentation Placement

- 通用分析方法现在统一放在 `docs/skills/main-bundle-dependency-governance.md`
- 当前仓库的项目级规则放在 `docs/design/main-bundle-dependency-spec.md`
- 本文档只保留问题、根因和修复记录

## Notes For Future Refactors

- 新增工作区根或包来源时，先更新共享包识别逻辑，再调整 `manualChunks`。
- 如果 chunk 分析脚本不能识别当前构建产物语法，所有“拆包成功”的结论都应视为不可信。
- 页面目录旁边的公共组件很容易被误吸进页面 chunk，涉及多页面复用时应优先考虑 host 共享层。
