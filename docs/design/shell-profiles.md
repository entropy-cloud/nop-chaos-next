# Shell Profiles（壳形态配置）

> 本文档描述如何通过单一前端构建产物支持多种客户端形态（web、mobile、kiosk 等），包括 profile 的解析、对菜单加载和 shell 渲染的影响、以及与 extension 系统的关系。

---

## 1. 背景与目标

### 1.1 问题

业务团队可能基于同一套壳能力构建多种客户端形态：

| 形态 | 特征 |
| --- | --- |
| **web** | 完整 shell（侧栏 + 标签页 + 内容区），多级菜单导航 |
| **mobile** | 无 shell chrome，整个页面由单个 JSON schema 全屏渲染 |
| **kiosk / pos** | 可能只有顶栏 + 单页面，或自定义 chrome 组合 |

这些形态共享同一份壳代码、同一套渲染引擎、同一个构建产物，只是**加载的菜单配置不同**、**shell 外壳的显示形态不同**。

### 1.2 目标

- **一份构建产物，多种形态**：不为每种客户端单独构建或单独维护 fork
- **后端驱动**：形态差异由后端配置（菜单 + schema）决定，前端不硬编码业务
- **形态与配置正交**：profile 同时影响"加载什么"和"怎么显示"，但两者解耦演进
- **零侵入**：复用现有 `siteId` 机制和 extension 注入机制，不引入第二套并行体系

---

## 2. 核心概念

### 2.1 Profile

**Profile 是一个字符串标识**，代表一种客户端形态。它在 bootstrap 早期（React 首次渲染前）被解析一次，整个应用生命周期内不可变。

```
profile = "web" | "mobile" | "pos" | 任意业务自定义字符串
```

默认值为 `web`。profile 名称本身不携带语义——它只是后续推导 `siteId` 和 chrome 模式的 key。

### 2.2 两个正交维度

profile 的影响可拆解为两个独立维度：

| 维度 | 含义 | 控制点 |
| --- | --- | --- |
| **配置维度** | 从后端加载哪份菜单 / schema | 传给 `SiteMapApi__getSiteMap` 的 `siteId` |
| **形态维度** | shell 是否渲染侧栏 / 标签页 / 顶栏 | chrome 模式（`full` / `chromeless`） |

两者可以独立组合。例如一个 profile 可以是"完整 chrome + mobile 专属菜单"，也可以是"无 chrome + web 菜单"。

---

## 3. Profile 解析

### 3.1 解析来源与优先级

从高到低：

| 优先级 | 来源 | 适用场景 | 说明 |
| --- | --- | --- | --- |
| 1 | URL 查询参数 `?profile=mobile` | 开发调试、临时切换 | 最灵活，便于在同一部署上验证不同形态 |
| 2 | `window.__NOP_SHELL_PROFILE__` | 生产部署 | 由服务端在 HTML 注入，最稳定 |
| 3 | 默认值 `web` | 兜底 | 不传任何参数时的行为 |

**优先级设计理由**：

- URL 参数优先于 HTML 注入，是为了让开发者能在生产形态的部署上临时切换 profile 验证问题，而无需改服务端配置
- profile 只控制 UI 形态和菜单来源，**不承担权限控制**（权限由后端 roles 校验），因此允许用户通过 URL 覆盖不构成安全风险
- 如果未来某些场景需要锁定 profile（不允许 URL 覆盖），可在 HTML 注入时附带 `window.__NOP_SHELL_PROFILE_LOCKED = true`

### 3.2 解析时机

profile 必须在以下操作**之前**解析完成：

- `fetchMenuConfig()`（需要 siteId）
- extension bootstrap（可能需要按 profile 过滤 extension）
- `AppShell` 首次渲染（需要 chrome 模式）

因此解析逻辑应放在 `apps/main/src/config/profile.ts`，由 `main.tsx` 的 `bootstrap()` 在 `bootstrapExtensions()` 之前同步调用。

### 3.3 解析结果

`getShellProfile()` 返回一个不可变对象：

```typescript
interface ShellProfile {
  /** profile 名称，如 "web"、"mobile" */
  name: string;
  /** 传给后端 SiteMapApi__getSiteMap 的 siteId，默认等于 name */
  siteId: string;
  /** shell chrome 模式 */
  chromeMode: ShellChromeMode;
}

type ShellChromeMode = 'full' | 'chromeless';
```

默认推导规则：

| ShellProfile 字段 | 默认值 |
| --- | --- |
| `name` | 解析得到的 profile 字符串 |
| `siteId` | 默认等于 `name`（如 profile=`mobile` → siteId=`mobile`） |
| `chromeMode` | `name === 'web'` 时为 `full`，其余默认 `chromeless` |

> 默认规则覆盖最常见场景：web 用完整壳，非 web 形态默认无 chrome。如果业务需要"非 web 但保留完整 chrome"，或"web 但无 chrome"，通过 extension 覆盖（见 §5）。

---

## 4. Chrome 模式

### 4.1 两种模式

| 模式 | 渲染内容 | 适用场景 |
| --- | --- | --- |
| `full` | Sidebar + TabsBar + TopBar + 内容区（当前行为） | web 后台、需要多级导航的工作台 |
| `chromeless` | 仅内容区，全屏渲染 | mobile（整个页面是一个 JSON schema）、kiosk、嵌入式 |

### 4.2 chromeless 模式的语义

- 不渲染 `Sidebar`、`TabsBar`、`MobileTopBar`
- 不注册 tab 管理（`tabStore` 不工作）
- 不显示 layout settings 中与侧栏相关的配置项
- 路由仍由 `AppRoutes` 注册，但 shell 外壳退化为单个 `<Outlet />`
- `MainLayout` 退化为只渲染 `<main id="main-content">`

### 4.3 chromeless 下的菜单作用

即使 chrome 模式为 `chromeless`，后端返回的菜单仍然有意义：

- 决定路由结构（哪个 path 渲染哪个 schema）
- 决定首页路径（`home`）
- 提供权限过滤（`roles`）

典型 mobile 场景：后端只返回一条菜单项（首页），`pageType: 'amis'` 或 `'flux'`，schemaPath 指向一个全屏 JSON。

### 4.4 可扩展性

当前只定义 `full` 和 `chromeless` 两种。如果未来出现"只需要顶栏不要侧栏"等中间形态，可在 `ShellChromeMode` 中新增枚举值（如 `compact`），并在 `AppShell` 增加对应渲染分支。新增模式属于设计文档变更，不应在代码中隐式扩展。

---

## 5. 与 Extension 系统的关系

### 5.1 Extension 覆盖 profile 推导

Extension 可通过 `shell.profiles` 覆盖默认的 siteId / chromeMode 推导：

```typescript
interface ExtensionShellConfig {
  // ...现有字段
  profiles?: Record<string, ShellProfileOverride>;
}

interface ShellProfileOverride {
  siteId?: string;
  chromeMode?: ShellChromeMode;
}
```

示例：某业务希望 `pos` profile 保留完整 chrome 但使用不同 siteId：

```typescript
const extension: ShellExtension = {
  id: 'pos-extension',
  shell: {
    profiles: {
      pos: { chromeMode: 'full', siteId: 'pos-terminal' },
    },
  },
};
```

归并策略沿用现有 shell 配置语义：多 extension 按 `order` 排序，后者覆盖前者。

### 5.2 Extension 按 profile 过滤（可选）

`ShellExtension` 可声明 `profiles` 字段，限制该 extension 只在特定 profile 下加载：

```typescript
const extension: ShellExtension = {
  id: 'mobile-only-extension',
  profiles: ['mobile'],  // 只在 mobile profile 下加载
  // ...
};
```

- 未声明 `profiles` 字段的 extension 在所有 profile 下加载（向后兼容）
- 声明 `profiles` 的 extension 只在匹配当前 profile 时参与 bootstrap
- 过滤发生在 `loadExtensions()` 之前，不匹配的 extension 不执行 `setup()`、不注入任何资源

### 5.3 为什么不让 extension 完全决定 profile

profile 解析必须在 extension 加载**之前**完成（因为 extension 自身可能依赖 profile 过滤）。因此：

- profile **名称**来自 URL / window 注入，不依赖 extension
- profile 的 **siteId / chromeMode 推导**可被 extension 覆盖，但这是"修正默认推导"而非"决定 profile"

这一时序约束是 profile 解析放在 `main.tsx` bootstrap 最早阶段的原因。

---

## 6. 对现有系统的影响

### 6.1 菜单加载

当前 `apps/main/src/services/menuApi.ts:59` 硬编码 `siteId: 'main'`，需要改为从 profile 读取：

```typescript
// 改动前
data: { siteId: 'main' }

// 改动后
data: { siteId: getShellProfile().siteId }
```

后端 `SiteMapApi__getSiteMap` 已支持 `siteId` 参数，只需后端为每个 siteId 准备对应的菜单配置即可。这是本设计能成立的关键前提——**无需后端改动接口契约，只需后端准备不同 siteId 的配置数据**。

### 6.2 Shell 渲染

`AppShell.tsx` 需根据 `chromeMode` 决定是否渲染 Sidebar / TabsBar：

- `full`：保持现有行为
- `chromeless`：跳过 `MainLayout` 的 sidebar / tabsBar / mobileSidebar / topBar props，直接渲染 `<Outlet />`

### 6.3 路由

`AppRoutes` 的路由注册逻辑**不变**。无论 chrome 模式如何，路由仍由后端菜单驱动。chromeless 模式下只是 shell 外壳退化，路由分发仍正常工作。

### 6.4 Tab 管理

`chromeless` 模式下 tab 管理不工作（无 TabsBar）。`tabStore` 的调用方应能容忍此模式，或在 chromeless 下短路。这属于实现细节，不属于设计契约。

---

## 7. Mobile 场景完整流程

以 mobile 形态为例：

```
1. 用户访问 https://app.com/?profile=mobile
   (或服务端注入 window.__NOP_SHELL_PROFILE__ = "mobile")

2. bootstrap() 早期调用 resolveShellProfile()
   → { name: "mobile", siteId: "mobile", chromeMode: "chromeless" }

3. fetchMenuConfig() 以 siteId="mobile" 调用后端
   → 后端返回:
     {
       "home": "/home",
       "items": [{
         "id": "mobile-home",
         "path": "/home",
         "pageType": "amis",
         "schemaPath": "/api/mobile-home.json",
         "hideInMenu": true
       }]
     }

4. AppShell 检测 chromeMode === "chromeless"
   → 不渲染 Sidebar / TabsBar
   → 直接渲染 <Outlet />

5. RouteRenderer 按 pageType="amis" 渲染 AmisRouteEntry
   → 全屏渲染 mobile-home.json schema
```

后端只需为 `siteId="mobile"` 准备一份单条菜单配置和一个 schema 接口，前端无需任何代码改动（在 profile 机制实现后）。

---

## 8. 设计决策理由

### 8.1 为什么用 profile 字符串而非多个 HTML 入口

| 方案 | 评价 |
| --- | --- |
| **多 HTML 入口（mobile.html / web.html）** | ❌ 严格来说不是"同一构建产物单入口"；增加构建配置复杂度；Vite 多入口需要额外配置 |
| **URL hash 路由区分（`/#/mobile/...`）** | ❌ 与现有 HashRouter 路由冲突，profile 不应占用路由命名空间 |
| **Profile 字符串 + URL 参数 / HTML 注入（本方案）** | ✅ 单入口、可服务端注入、可运行时调试、与现有 extension 注入机制一致 |

### 8.2 为什么 siteId 默认等于 profile name

- 大多数场景下，profile 名称和 siteId 是一一对应的（mobile 形态对应 mobile 站点配置）
- 让两者默认相等减少配置心智负担
- 如果需要解耦（如两个 profile 共享一个 siteId 的菜单但 chrome 不同），通过 extension `shell.profiles` 覆盖

### 8.3 为什么 chrome 模式默认"非 web 即 chromeless"

- mobile / kiosk 等形态的最常见诉求就是"全屏渲染单个页面，不要 shell 外壳"
- 让非 web profile 默认 chromeless 覆盖了 90% 场景
- 保留 extension 覆盖能力处理例外

### 8.4 为什么不让后端在菜单响应中返回 chrome 模式

考虑过让 `SiteMapApi__getSiteMap` 的响应附带 `{ shell: { chromeMode: "chromeless" } }`，但被否决：

- chrome 模式是 **shell 渲染层**的关注点，不属于菜单数据模型
- 菜单加载是异步的，但 chrome 模式影响首屏 shell 骨架，应在 bootstrap 同步阶段确定，避免"先渲染 full shell 再切到 chromeless"的闪烁
- profile 机制把"形态决策"前置到同步解析阶段，更稳定

---

## 9. 边界与约束

### 9.1 profile 不承担的职责

- **不控制权限**：权限由后端 `roles` 校验决定，profile 仅控制 UI 形态和菜单来源
- **不控制主题**：主题切换由现有 theme 系统处理，与 profile 正交
- **不控制认证流程**：登录/登出逻辑对所有 profile 一致（除非 extension 覆盖 `systemPages.login`）

### 9.2 运行时不可切换

profile 在 bootstrap 解析后不可变。用户不能在运行时从 web 切换到 mobile——这需要刷新页面（带新的 `?profile=` 参数）。这是有意的设计：

- 避免 shell 形态在会话中途变化导致的 UI 不一致
- 简化所有消费方的推理模型（profile 是常量）

### 9.3 与 workspaceFullscreen 的区别

| 特性 | workspaceFullscreen | chromeMode: chromeless |
| --- | --- | --- |
| 触发方式 | 用户主动按 F11 / 点击按钮 | bootstrap 时由 profile 决定 |
| 侧栏是否可恢复 | 是（再按 F11 恢复） | 否（该形态天生无侧栏） |
| TabsBar 是否保留 | 隐藏 | 隐藏 |
| 持久化 | 是（layoutStore） | 否（profile 不可变） |

两者独立工作，互不干扰。

### 9.4 后端契约前提

本设计依赖后端 `SiteMapApi__getSiteMap` 接受并正确处理 `siteId` 参数。如果后端尚未支持多 siteId，则所有 profile 会拿到相同菜单——此时 profile 机制仍可用于切换 chrome 模式，但无法实现"不同形态加载不同页面"。

---

## 10. 相关文件

| 文件 | 角色 |
| --- | --- |
| `apps/main/src/config/profile.ts`（新增） | profile 解析与缓存 |
| `apps/main/src/main.tsx` | bootstrap 早期调用 `resolveShellProfile()` |
| `apps/main/src/services/menuApi.ts` | `siteId` 改为从 profile 读取 |
| `apps/main/src/router/AppShell.tsx` | 按 `chromeMode` 决定 shell 外壳渲染 |
| `apps/main/index.html` | 可选：增加 `<!--NOP_SHELL_PROFILE_INJECT-->` 占位 |
| `packages/shared/src/types/extension.ts` | `ExtensionShellConfig.profiles` 与 `ShellExtension.profiles` 类型 |
| `apps/main/src/extensions/bootstrap.ts` | extension 按 profile 过滤 |

---

## 11. 相关文档

- [overview.md](./overview.md) — 系统架构总览，profile 属于 Shell Layer 的扩展
- [extension-system.md](./extension-system.md) — extension 可覆盖 profile 推导
- [backend-integration.md](./backend-integration.md) — SiteMap API 与 siteId 合同
- [layout-settings.md](./layout-settings.md) — workspaceFullscreen 与 chromeMode 的区别
