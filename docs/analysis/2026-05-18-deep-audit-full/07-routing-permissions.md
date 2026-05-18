# 维度 07：路由、权限与页面注册

## 第 1 轮（初审）

结论：首轮初审发现 3 项。未发现菜单过滤未递归导致的直接权限绕过；当前双层模型下，受限 URL 仍会落到路由守卫而非直接渲染受限内容。

### [维度07-01] `/auth/login` 未走 extension system page override
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\router\AppRoutes.tsx:68-79`
- **证据片段**:
```ts
<Route
  path="/auth/login"
  element={
    bootstrapPending ? (
      <div className="min-h-screen bg-background" />
    ) : isAuthenticated ? (
      <Navigate replace to={homePath} />
    ) : (
      <LoginPage />
```
- **严重程度**: P1
- **现状**: 登录路由直接渲染 `LoginPage`，没有通过 `getSystemPage('login')` 解析 extension 覆盖页。
- **风险**: extension 声明的 `systemPages.login` 对真实登录入口不生效；自定义登录页合同被实际绕过，审计上属于 canonical URL 与 system page override 不一致。
- **建议**: 将 `/auth/login` 路由改为与 `403/404/500` 同样的 system page 分发逻辑，统一走 `getSystemPage('login') ?? LoginPage`。
- **误报排除**: `C:\can\nop\nop-chaos-next\apps\main\src\router\pageRegistry.tsx:77-79` 已提供 `getSystemPage()` 能力，说明这里不是“系统不支持”，而是登录入口没有接入该能力。
- **复核状态**: `未复核`

### [维度07-02] `systemPages.dashboard` 不覆盖 canonical `/dashboard` 路由
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\router\AppRoutes.tsx:93-104`
- **证据片段**:
```ts
{systemPageRoutes.map(({ path, key, fallback: Fallback }) => {
  const Override = getSystemPage(key);
  const Component = Override ?? Fallback;
  return <Route key={path} path={path} element={<Component />} />;
})}
{menuQuery.isSuccess
  ? routeItems.map((item) => (
      <Route
        key={item.id}
        path={normalizePath(item.path)}
        element={<RouteRenderer item={item} />}
```
- **严重程度**: P2
- **现状**: system page override 只接到了 `403/404/500`；`/dashboard` 仍作为普通菜单路由走 `RouteRenderer`，最终按菜单上的 `componentId` 渲染，而不是按 `systemPages.dashboard` 解析。
- **风险**: extension 虽可声明 `systemPages.dashboard`，但用户直接访问 `/dashboard` 时仍可能落到宿主 builtin dashboard；造成首页、书签地址、旧链接与 extension override 行为不一致。
- **建议**: 对 canonical dashboard 入口建立显式 system-page 分发，或在 dashboard 菜单路由解析时优先尊重 `systemPages.dashboard`。
- **误报排除**: `C:\can\nop\nop-chaos-next\apps\main\src\router\pageRegistry.tsx:67-80` 明确存在 `dashboard` 的 system page key；问题在于路由层未消费该 key，而非 extension 配置缺失。
- **复核状态**: `未复核`

### [维度07-03] 未识别 `pageType` 在后端映射链路中被静默降级为 `builtin`
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\services\menuMapper.ts:70-90`
- **证据片段**:
```ts
if (componentKey === 'plugin' && resource.url) {
  return 'plugin';
}

if (metaPageType === 'flux') {
  return 'flux';
}

if (resource.component === 'AMIS') {
  return 'amis';
}

if (resource.component === 'IFRAME') {
  return resource.target === 'external' ? 'external' : 'iframe';
}

return 'builtin';
```
- **严重程度**: P2
- **现状**: 非 mock/静态菜单走 legacy mapper 时，未知 `meta.pageType`/`component` 不会显式报错或走 unknown fallback，而是默认映射成 `builtin`。
- **风险**: 后端若下发未支持的新类型或脏数据，前端会把其当 builtin 路由注册；随后可能误落到错误 builtin、500，或与菜单/页面合同不一致，难以及时发现真实配置问题。
- **建议**: 为 legacy mapper 增加显式 unknown 分支；至少记录告警并落到清晰错误态，而不是默认 `builtin`。
- **误报排除**: `C:\can\nop\nop-chaos-next\packages\shared\src\utils\menuConfig.ts:63-78` 只保护已成型的 `MenuResponse`；但当前非 mock 主链路先经过 `menuMapper.ts`，因此这里的静默降级真实存在。
- **复核状态**: `未复核`

补充说明：
- 已核对 `C:\can\nop\nop-chaos-next\packages\shared\src\utils\menu.ts` 的 `filterMenusByRoles()`，递归过滤到所有层级。
- 已核对 `C:\can\nop\nop-chaos-next\apps\main\src\router\RouteRenderer.tsx` 的 `usePermissionGuard()`，直接访问受限 URL 时会返回 `ForbiddenPage`，未见首轮“直接渲染受限页面”的绕过。
- tab/route 同步首轮未发现 blocker；但建议二轮补测 `C:\can\nop\nop-chaos-next\apps\main\src\pages\flow-editor\[id]\index.tsx` 与 `C:\can\nop\nop-chaos-next\apps\main\src\pages\data-management\master-detail\index.tsx` 的浏览器前进/后退场景。

## 深挖第 2 轮追加

### [维度07-04] 未知 URL 命中 `*` 路由时未走 `systemPages.notFound`
- **文件**: `apps/main/src/router/AppRoutes.tsx:93-107`
- **证据片段**:
```tsx
{systemPageRoutes.map(({ path, key, fallback: Fallback }) => {
  const Override = getSystemPage(key);
  const Component = Override ?? Fallback;
  return <Route key={path} path={path} element={<Component />} />;
})}
...
<Route path="*" element={menuQuery.isSuccess ? <NotFoundPage /> : shellFallback} />
```
- **严重程度**: P1
- **现状**: extension 的 `systemPages.notFound` 只覆盖了显式 `/404` 路由；真实的未知地址直达走的是 `*` 分支，直接渲染宿主 `NotFoundPage`。
- **风险**: “canonical 404 页”与“真实未知 URL 的 404 结果”分裂；extension 自定义 404 在用户最常见的直达/书签错误场景下失效。
- **建议**: 将 `*` 分支也统一改为 `getSystemPage('notFound') ?? NotFoundPage`。
- **误报排除**: `pageRegistry.tsx` 已提供 `notFound` system page 解析能力，问题在于 wildcard fallback 未消费该能力。
- **复核状态**: `未复核`

### [维度07-05] 权限守卫与路由异常态未走 `systemPages.forbidden/serverError`
- **文件**: `apps/main/src/router/RouteRenderer.tsx:66-70,145-146`; `apps/main/src/router/AppRoutes.tsx:60-64`
- **证据片段**:
```tsx
if (!allowed) {
  return <ForbiddenPage />;
}
...
if (!Page) {
  return <ServerErrorPage />;
}
```
```tsx
const shellFallback = menuQuery.isError ? (
  <ServerErrorPage />
) : (
  <div className="min-h-screen bg-background" />
);
```
- **严重程度**: P1
- **现状**: `systemPages.forbidden` / `systemPages.serverError` 只对显式 `/403`、`/500` 生效；真实权限拒绝、builtin 解析失败、菜单加载失败等主链路异常，仍直接落宿主 fallback。
- **风险**: extension 自定义 403/500 只覆盖“手工访问 canonical 错误页”，无法覆盖真正的守卫拒绝和运行态错误；错误页扩展合同与实际流量入口不一致。
- **建议**: 统一把这些运行态 fallback 改为 `getSystemPage('forbidden'|'serverError') ?? Fallback`。
- **误报排除**: `AppRoutes.tsx` 已证明 `/403`、`/500` 路由本身支持 system page override，因此不是系统能力缺失，而是异常路径未统一接线。
- **复核状态**: `未复核`

### [维度07-06] extension 可通过保留 `componentId` 静默覆盖宿主 builtin/system fallback，且多扩展冲突无告警
- **文件**: `apps/main/src/router/pageRegistry.tsx:49-64,67-80`; `apps/main/src/extensions/bootstrap.ts:104-105`
- **证据片段**:
```tsx
const contributedBuiltinPageRegistry: Record<string, BuiltinPage> = {};

export function registerBuiltinPages(
  pages: Array<{ componentId: string; component: BuiltinPage }>,
) {
  for (const page of pages) {
    contributedBuiltinPageRegistry[page.componentId] = page.component;
  }
}
```
```tsx
const defaultSystemPageIds = {
  login: 'system-login',
  forbidden: 'system-forbidden',
  notFound: 'system-not-found',
  serverError: 'system-server-error',
  dashboard: 'dashboard',
} as const;
```
- **严重程度**: P1
- **现状**: extension 只要注册与宿主保留 ID 同名的 `builtinPages.componentId`，就会优先于宿主页被解析；整个过程无保留字校验、无冲突告警、无“必须显式声明 systemPages 才可覆盖”的约束。
- **风险**: extension 可绕过 `systemPages` 显式合同，直接劫持 `/dashboard` 或 system page fallback；多个 extension 注册同名 `componentId` 时，后加载者静默覆盖先加载者，页面归属变成 order 依赖。
- **建议**: 对宿主保留 `componentId` 建立保留名单；默认禁止 extension 直接覆盖，必须通过显式 allowlist 或 `systemPages` 合同声明，并在冲突时输出告警/抛错。
- **误报排除**: `bootstrap.ts` 确认 extension builtin page 会在启动期实际注册到全局 registry；`getBuiltinPage()` 又明确让 contributed registry 优先于 host registry，因此该覆盖链路真实存在。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度07-07] 首页路径解析未校验“当前用户是否可访问”，可把成功登录/根路由重定向到 403 或隐藏页
- **文件**: `apps/main/src/config/systemMenus.ts:162-169`; `apps/main/src/router/AppRoutes.tsx:55,93`; `apps/main/src/pages/auth/login/index.tsx:63-66`
- **证据片段**:
```ts
const availablePaths = new Set(flattenMenus(items).map((item) => item.path));
const extensionHome = getExtensionDefaultHomePath();
const homeCandidate =
  menuResponse.home && availablePaths.has(menuResponse.home)
    ? menuResponse.home
    : extensionHome && availablePaths.has(extensionHome)
      ? extensionHome
      : getDefaultHomePath();
```
- **严重程度**: P1
- **现状**: `mergeBuiltinSystemMenus()` 仅校验首页候选路径是否存在于完整菜单树，不校验该路径在当前用户角色下是否仍可见/可访问；而登录成功跳转、`/` 首页重定向都会直接消费该 `homePath`。
- **风险**: 后端或 extension 若把 `menuResponse.home` / `shell.defaultHomePath` 指向受限页、隐藏页或非入口详情页，用户会在登录后或进入根路由时被直接送到 403、隐藏页或异常页面。
- **建议**: `homeCandidate` 应基于当前用户过滤后的可访问菜单求值；至少排除 `hideInMenu`、权限不满足项以及明显非首页型的动态详情路由。
- **误报排除**: `filterMenusByRoles()` 只用于侧边栏显示，`homePath` 已在此之前按完整菜单树写入并被重定向逻辑消费。
- **复核状态**: `未复核`

### [维度07-08] `/settings*` 宿主 canonical 路由可被同 path 菜单静默覆盖，用户菜单会把“设置/主题/语言”按钮导向任意页面或 403
- **文件**: `apps/main/src/config/systemMenus.ts:105-127`; `apps/main/src/components/layout/SidebarUserMenu.tsx:99-118`
- **证据片段**:
```ts
function isSameMenuItem(left: MenuItem, right: MenuItem) {
  return left.id === right.id || left.path === right.path;
}

function mergeMenuItem(existingItem: MenuItem, builtinItem: MenuItem): MenuItem {
  return {
    ...builtinItem,
    ...existingItem,
    children: mergeMenuItems(existingItem.children, builtinItem.children),
  };
}
```
- **严重程度**: P1
- **现状**: 内建系统菜单与外部菜单按 `id` 或 `path` 相同即合并，且 `existingItem` 字段覆盖 builtin；同时用户菜单仍硬编码导航到 `/settings`、`/settings/theme`、`/settings/language`。
- **风险**: 后端菜单或 extension 只要声明相同 path，就能无告警接管宿主“设置”入口；用户点击看似宿主设置按钮，实际可能落到 plugin、任意 builtin、受限页甚至 403。
- **建议**: 为 `/settings*` 建立保留 path 保护；默认禁止菜单层同 path 覆盖宿主系统入口，或至少要求显式 allowlist 并在冲突时告警。
- **误报排除**: 这不等同于已记录的 `componentId` 覆盖问题；这里即使不碰保留 `componentId`，也能仅凭同 path 菜单合并改写用户菜单硬编码入口。
- **复核状态**: `未复核`

## 维度复核结论

- [维度07-01]: 保留 (P1)。`/auth/login` 仍未走 `getSystemPage('login')`。
- [维度07-02]: 保留 (P2)。canonical `/dashboard` 仍不消费 `getSystemPage('dashboard')`。
- [维度07-03]: 驳回。legacy mapper 未知类型默认回落 `builtin` 是当前已测试固化的既有设计。
- [维度07-04]: 保留 (P1)。未知 URL 命中 `*` 时仍未走 `systemPages.notFound`。
- [维度07-05]: 降级 (P2)。权限拒绝和运行态异常未走 system pages 属于合同接线不全，而非权限绕过。
- [维度07-06]: 驳回。`builtinPages` 按 `componentId` 覆盖是当前文档已承认的归并语义。
- [维度07-07]: 保留 (P1)。`homePath` 解析仍只校验路径存在，不校验当前用户可访问性。
- [维度07-08]: 降级 (P2)。`/settings*` 同 path 覆盖属保留路径保护不足，但前提是外部菜单主动声明同 path。

## 子项复核结论

- [维度07-01]: 子项复核通过。`/auth/login` 仍未接入 `systemPages.login`。
- [维度07-04]: 子项复核通过。wildcard `*` 仍未接入 `systemPages.notFound`。
- [维度07-07]: 子项复核通过。`homePath` 仍按完整菜单树求值，可能把用户重定向到不可访问入口。
