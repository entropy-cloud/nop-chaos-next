# Shell Contribution ESM 设计

> 本文档描述宿主如何通过 ESM contribution 加载宿主级扩展能力。它解决的是主题、语言、菜单、插件声明等“宿主配置注入”问题，不替代页面级插件加载。

---

## 1. 当前结论

- 页面级扩展继续走 `pageType: 'plugin'` + `SystemJS`
- 宿主级扩展使用 ESM contribution
- contribution 负责注册配置和资源，不负责页面组件实例挂载
- 当前不考虑运行时卸载，因此不需要额外的可卸载模块沙箱

当前加载入口：`apps/main/src/contributions/loadContributions.ts`

---

## 2. contribution 适合承载什么

适合：

- 应用品牌配置
- 主题注册
- 语言列表和 i18n 资源
- 插件清单声明
- 菜单扩展
- 宿主运行时配置
- 样式资源声明

不适合：

- 频繁重建 UI 状态的页面组件树
- 强依赖宿主内部细节的页面逻辑
- 需要独立卸载的页面实例能力

---

## 3. 为什么使用 ESM

- contribution 主要在启动时加载一次
- 它本质上是注册行为，不是页面渲染行为
- Vite 对 ESM 开发和构建支持直接，联调成本低
- 当前场景不要求卸载，所以 ESM 足够简单

一句话区分：

- `plugin page` 负责渲染业务页面
- `contribution` 负责告诉宿主“有哪些主题、菜单、插件和资源”

---

## 4. 当前数据模型

当前类型定义位置：`packages/shared/src/types/contribution.ts`

关键结构：

- `ContributionSource`
  - `id`
  - `entry`
  - `enabled`
- `ShellContribution`
  - `app`
  - `languages`
  - `i18nResources`
  - `themes`
  - `styles`
  - `builtinPages`
  - `plugins`
  - `menus`
  - `setup()`

说明：

- `entry` 指向 ESM 入口
- `setup()` 用于启动阶段执行补充初始化逻辑

---

## 5. 当前加载约定

宿主会：

1. 读取 contribution source 列表
2. 逐个动态 `import()` 加载 ESM 模块
3. 兼容三种导出方式
4. 校验是否为合法 contribution
5. 执行 `setup()`
6. 按 `order` 排序返回

当前支持的导出方式：

- `export default contribution`
- `export const contribution = ...`
- `export function getContribution() { ... }`

当前实现位置：`apps/main/src/contributions/loadContributions.ts`

---

## 6. 宿主启动时的注册顺序

建议顺序：

1. 加载 contribution 列表
2. 合并语言配置
3. 注册 i18n 资源
4. 注册主题和主题 CSS
5. 合并插件 manifests
6. 合并菜单
7. 最后再渲染应用

这样可以保证：

- 宿主启动前就拿到完整扩展配置
- 页面渲染时已经知道新增主题、菜单和插件入口

---

## 7. 与插件系统的关系

contribution 可以声明插件入口和对应菜单，但不负责插件页面本体的加载协议。

职责划分：

- contribution：声明插件 manifest、菜单、样式资源、主题、语言
- plugin page：仍由宿主通过 SystemJS 按页面渲染

插件开发边界见：`docs/08-plugin-dev-guide.md`

---

## 8. 样式边界

当前 contribution 类型已支持：

- `themes`
- `styles`

建议约束：

- contribution 负责声明样式资源地址
- 业务新增 Tailwind utilities 仍由业务项目自己的构建产物提供
- 不要把 contribution 当作 Tailwind 编译机制本身

这意味着：

- 宿主可注入额外 theme CSS
- 业务插件仍应维护自己的增量 CSS 产物

---

## 9. 调试与部署建议

### 9.1 同仓开发

- contribution 可作为 workspace 包直接被宿主加载

### 9.2 跨仓联调

- `entry` 可直接指向业务仓库的 ESM dev 地址
- 插件页面入口仍可单独指向 `system.js` 产物

### 9.3 生产部署

- contribution 输出稳定 ESM 文件
- 插件页面继续输出 `*.system.js`
- source 列表建议来自静态配置或后端配置

---

## 10. 错误处理与边界

### 10.1 加载失败

- 单个 contribution 加载失败不应阻塞宿主启动
- 应记录清晰错误日志
- 失败项不参与后续合并

### 10.2 冲突处理

潜在冲突项包括：

- theme id
- language code
- menu path
- plugin id
- 文案 key

建议默认按 `order` 合并，并对关键主键冲突打出明确告警。

### 10.3 安全边界

- 仅加载受信任来源
- 生产环境建议固定白名单域名
- 不建议把 contribution 地址暴露给普通用户自由编辑

---

## 11. 参考实现

- `apps/main/src/contributions/loadContributions.ts`
- `packages/shared/src/types/contribution.ts`
- `apps/main/src/router/RouteRenderer.tsx`
- `apps/main/src/plugins/sharedModules.ts`
- `packages/plugin-bridge/src/index.ts`
