# 25 AMIS File Dependency Runtime Split

## Problem

- 登录后进入 AMIS 页面时，主壳会在浏览器里报错，典型现象是 `Cannot read properties of null (reading 'useCallback')`。
- 报错位置落在打包后的 `vendor-react-*` / `vendor-amis-bridge-*` chunk，看起来像普通组件空指针，但实际发生在宿主 React 与 AMIS React 运行时交界处。
- 同一时期的 Playwright 也出现了 AMIS、登录后壳菜单、Flux lazy-loading 等不稳定失败，增加了误判难度。

## Diagnostic Method

- 先从页面症状出发，直接复现 `/#/amis/preview` 的登录后崩溃，确认不是纯测试问题。
- 再检查构建堆栈与 `packages/amis-react/package.json`，发现 `@nop-chaos/amis-react` 通过 `file:` 依赖直接引用了 `../amis-react19/packages/*`，这意味着其依赖解析根可能不在当前仓库。
- 用 `createRequire(...).resolve(...)` 分别对 `apps/main`、`../amis-react19/packages/amis`、`../amis-react19/packages/amis-core`、`../amis-react19/packages/amis-ui` 做实际解析对比，确认 `react` / `react-dom` 分别落到了两个不同项目的安装根：
  - 宿主：`C:\can\nop\nop-chaos-next\node_modules\.pnpm\react@19.2.5\...`
  - AMIS 外部包：`C:\can\nop\amis-react19\node_modules\react\index.js`
- 在同一轮对比中继续检查其他共用库，确认 `mobx`、`mobx-react`、`mobx-state-tree`、`lodash`、`react-router-dom`、`history`、`echarts` 也会从 `amis-react19` 的依赖根单独解析。
- 最后结合源代码使用面判断风险等级：宿主当前直接共享的是 React、路由导航、i18n、toast、zustand store 等宿主能力；AMIS 内部自带的 `mobx` / `mst` / `lodash` / `echarts` 目前没有与宿主做对象级共享，因此它们是“重复依赖/潜在边界风险”，但不是这次页面崩溃的直接根因。

## Root Cause

- `@nop-chaos/amis-react` 作为 React 组件桥接包，却把 `react` 放进了自己的 `dependencies`，而不是 `peerDependencies`。在 `file:` 外部包链路下，这会让 AMIS 桥接层有机会绑定到外部项目自己的 React 安装。
- `apps/main` 同时也直接声明了 `amis` / `amis-core` / `amis-formula` / `amis-ui` 的 `file:` 依赖，因此 Vite 需要跨两个项目根解析这些外部包。如果不显式收口单例依赖，打包结果会保留“按各自依赖根解析”的倾向。
- 其他共用库也存在重复解析现象，但风险分级不同：
  - `react` / `react-dom`：必须单例。重复实例会直接破坏 hooks、context、reconciler 边界，是本次真实崩溃根因。
  - `mobx` / `mobx-react` / `mobx-state-tree`：当前主要由 AMIS 内部自用，短期更像内部子系统依赖；若未来宿主与 AMIS 之间直接传递 observable/store/model，重复实例会变成真实语义风险。
  - `lodash`：重复主要是体积与缓存问题，不是运行时语义问题。
  - `react-router-dom` / `history`：宿主使用 v7，AMIS 外部链使用 v5；当前宿主没有把 AMIS 挂到同一 router 实例内部，因此不是本次 crash 根因，但说明跨边界共享路由能力时必须通过宿主适配层而不能混用库实例。
  - `echarts`：当前更偏体积重复；若未来需要宿主与 AMIS 共享 `echarts` 扩展注册或全局主题，仍应考虑统一提供。
- 当前运行时里的 Flux 情况与 AMIS 不同：`flux-lib/ui` 是当前 monorepo workspace 包，不是外部 `file:` 依赖；因此它没有形成这次这种“外部项目 node_modules 解析根”问题。未来如果引入 `@nop-chaos/flux` 的 tarball / `file:` 包，同样应遵守宿主统一提供单例依赖的规则。

## Fix

- 先做依赖边界修正：
  - `packages/amis-react/package.json` 不再把 `react` 作为普通运行时依赖，而是改为 `peerDependencies`。
  - 这一步不是临时 hack，而是 React 组件桥接包的正确声明方式。React 应由宿主提供，桥接包只声明兼容范围。
- 再做构建层兜底：
  - `apps/main/vite.config.ts` 增加 `resolve.dedupe: ['react', 'react-dom']`
  - 同时把 `react` / `react-dom` alias 到仓库根 `node_modules`
  - 这一步属于防御性收口，不替代正确的依赖声明，但能在 `file:` / linked package / monorepo 混合解析下强制维持 React 单例。
- 同期补齐了共享菜单模型与 Flux 路由映射缺口：
  - `packages/shared/src/utils/menuConfig.ts` 接受 `pageType: 'flux'`
  - `apps/main/src/services/menuMapper.ts` 映射 legacy `meta.pageType === 'flux'` 和 `meta.schemaPath`
  - 这不是 AMIS crash 的根因修复，但消除了测试期暴露出的另一条跨包模型漂移问题。
- 对“其他共用库”没有一刀切全部 alias/dedupe：
  - 这不是遗漏，而是有意按风险分级处理。
  - 当前最合理的长期策略是：
    - 必须单例的运行时：`react`、`react-dom`
    - 原则上能不重复的共享运行时都不允许重复；仓库新增 `scripts/check-main-external-runtime-deps.mjs` 作为门禁，持续检查 `file:` 外部包与宿主之间的物理解析是否分裂
    - 通过宿主适配层共享、避免直接跨边界传实例的能力：router、i18n、toast、auth、store
    - 当前门禁已把 `react-router-dom` 与 `echarts` 标成真实 violation；`react` / `react-dom` 则标成“由 bundler override 收口”，避免把已知并已兜底的问题重新误报为未处理状态

## Tests

- `packages/shared/src/utils/menuConfig.test.ts` - 验证共享菜单校验允许 `pageType: 'flux'` 并要求 `schemaPath`。
- `apps/main/src/services/menuMapper.test.ts` - 验证 legacy menu 响应能正确映射 Flux 页面类型和 `schemaPath`。
- `tests/e2e/login.spec.ts` - 验证登录后能稳定进入主壳，不再因菜单基线漂移误报失败。
- `tests/e2e/sidebar-user-menu.spec.ts` - 验证登录后壳菜单可见，用户菜单行为稳定。
- `tests/e2e/lazy-loading.spec.ts` - 验证 AMIS / Flux 路由的当前 lazy-loading 行为与 renderer chunk 加载。
- `scripts/check-main-external-runtime-deps.mjs` - 验证 `apps/main` 的外部 `file:` 包不会把受管控的共享运行时解析成多个物理实例。

## Affected Files

- `packages/amis-react/package.json`
- `apps/main/vite.config.ts`
- `packages/shared/src/utils/menuConfig.ts`
- `packages/shared/src/utils/menuConfig.test.ts`
- `apps/main/src/services/menuMapper.ts`
- `apps/main/src/services/menuMapper.test.ts`
- `tests/e2e/support/auth.ts`
- `tests/e2e/login.spec.ts`
- `tests/e2e/sidebar-user-menu.spec.ts`
- `tests/e2e/lazy-loading.spec.ts`
- `scripts/main-bundle-utils.mjs`
- `scripts/check-main-external-runtime-deps.mjs`
- `package.json`

## Notes For Future Refactors

- 只要继续通过外部 `file:` / tarball / linked package 引入 React 相关渲染器，就必须把 `react` / `react-dom` 视为宿主单例依赖，不能回退成子包 `dependencies`。
- `resolve.dedupe + alias` 不是这次修复的全部，它是对正确依赖声明的构建层保护网。去掉它之前，需要先证明所有外部渲染包都不会从独立依赖根解析 React。
- `mobx` / `mobx-react` / `mobx-state-tree` / `echarts` 当前虽不是这次 crash 的根因，但已经确认会在 `amis-react19` 链路中解析出独立副本。未来若宿主开始直接传递这些库的实例、model、observable、主题或注册器，应重新评估是否要升级为宿主统一共享依赖。

## Documentation Placement

- 通用依赖治理分析方法见 `docs/skills/main-bundle-dependency-governance.md`
- 当前项目的 bundle 依赖规范见 `docs/design/main-bundle-dependency-spec.md`
- 本文档只保留这次运行时分裂问题的事实记录
