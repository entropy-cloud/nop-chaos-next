# 打包优化方案：按需加载 AMIS 和 Flux

## 问题分析

### 当前问题

1. **AMIS 强制初始化**：`apps/main/src/App.tsx` 中同步调用 `ensureAmisRuntime()`，导致 AMIS 相关代码被打包到主包
2. **无条件加载**：即使菜单中没有 AMIS 页面，AMIS 相关的 vendor chunks 也会被加载
3. **未来 Flux 集成**：需要为 Flux 设计同样的按需加载策略，避免重复的问题

### 影响分析

```bash
# 当前打包分析
pnpm build:analyze
# 查看打包报告
open apps/main/dist/stats.html
```

预期问题：
- `vendor-amis`、`vendor-amis-ui`、`vendor-amis-formula` 可能被不必要地加载
- `host-amis-*` chunks 在应用启动时就被加载
- 初始包体积较大，影响首屏加载时间

## 优化目标

1. **按需加载 AMIS**：只有当访问 AMIS 页面时才加载相关代码
2. **菜单驱动的加载策略**：基于菜单配置决定是否需要预加载 AMIS/Flux
3. **最小化初始包**：确保不包含 AMIS/Flux 的应用初始包最小化
4. **Flux 兼容**：为未来的 Flux 迁移预留相同的加载策略

## 优化方案

### 1. 动态加载策略

#### 1.1 移除同步初始化

**文件**：`apps/main/src/App.tsx`

```tsx
// ❌ 之前：同步初始化
import { ensureAmisRuntime } from './amis/init'

useEffect(() => {
  if (didRegisterSharedModules) {
    return
  }
  registerBaseSharedModules()
  ensureAmisRuntime()  // 强制加载 AMIS
  didRegisterSharedModules = true
}, [])

// ✅ 之后：移除同步初始化
useEffect(() => {
  if (didRegisterSharedModules) {
    return
  }
  registerBaseSharedModules()
  // AMIS 初始化移到 RouteRenderer 中按需加载
  didRegisterSharedModules = true
}, [])
```

#### 1.2 页面级动态加载

**文件**：`apps/main/src/router/RouteRenderer.tsx`

```tsx
import { lazy, Suspense, useMemo, useState, useEffect } from 'react'
import type { MenuItem } from '@nop-chaos/shared'

// AMIS 渲染器延迟加载
const AmisRouteRenderer = lazy(async () => {
  // 动态导入 AMIS 初始化
  const { ensureAmisRuntime } = await import('../amis/init')
  ensureAmisRuntime()

  const module = await import('../amis/AmisRouteRenderer')
  return { default: module.AmisRouteRenderer }
})

// Flux 渲染器延迟加载（未来）
const FluxRouteRenderer = lazy(async () => {
  // 动态导入 Flux 初始化
  const { ensureFluxRuntime } = await import('../flux/init')
  ensureFluxRuntime()

  const module = await import('../flux/FluxRouteRenderer')
  return { default: module.FluxRouteRenderer }
})

export function RouteRenderer({ item }: RouteRendererProps) {
  // ... 现有代码 ...

  if (item.pageType === 'amis' && item.schemaPath) {
    return (
      <Suspense fallback={loadingView}>
        <AmisRouteRenderer key={item.schemaPath} schemaPath={item.schemaPath} title={title} />
      </Suspense>
    )
  }

  // 未来 Flux 支持
  if (item.pageType === 'flux' && item.schemaPath) {
    return (
      <Suspense fallback={loadingView}>
        <FluxRouteRenderer key={item.schemaPath} schemaPath={item.schemaPath} title={title} />
      </Suspense>
    )
  }

  // ... 其他页面类型 ...
}
```

### 2. 菜单驱动的预加载策略

#### 2.1 运行时检测

**文件**：`apps/main/src/hooks/useRuntimeCapabilities.ts`（新建）

```tsx
import { useMemo } from 'react'
import type { MenuItem } from '@nop-chaos/shared'
import { flattenMenus } from '@nop-chaos/shared'

export interface RuntimeCapabilities {
  needsAmis: boolean
  needsFlux: boolean
}

export function useRuntimeCapabilities(menus: MenuItem[]): RuntimeCapabilities {
  return useMemo(() => {
    const flattened = flattenMenus(menus)

    return {
      needsAmis: flattened.some((item) => item.pageType === 'amis'),
      needsFlux: flattened.some((item) => item.pageType === 'flux'),
    }
  }, [menus])
}
```

#### 2.2 可选的预加载

**文件**：`apps/main/src/App.tsx`

```tsx
import { useRuntimeCapabilities } from './hooks/useRuntimeCapabilities'
import { useMenuConfigQuery } from './hooks/useMenuConfig'

export default function App() {
  // ... 现有代码 ...

  const menuQuery = useMenuConfigQuery(isAuthenticated && !bootstrapPending)
  const capabilities = useRuntimeCapabilities(menuQuery.data?.items ?? [])

  // 可选：在后台预加载 AMIS（如果菜单中有 AMIS 页面）
  useEffect(() => {
    if (capabilities.needsAmis && didRegisterSharedModules) {
      // 预加载但不初始化
      import('../amis/init').catch(() => {
        // 静默失败，不影响主流程
      })
    }
  }, [capabilities.needsAmis])

  // ... 现有代码 ...
}
```

### 3. Vite 打包配置优化

#### 3.1 确保正确的 chunk 分割

**文件**：`apps/main/vite.config.ts`

当前配置已经比较完善，确保以下关键点：

```typescript
// AMIS 相关的 vendor chunks
if (packageName === 'amis') {
  return 'vendor-amis'
}

if (packageName === 'amis-ui') {
  return 'vendor-amis-ui'
}

if (packageName === 'amis-formula') {
  return 'vendor-amis-formula'
}

// AMIS bridge packages
if (workspacePackageName === '@nop-chaos/amis-react' || workspacePackageName === '@nop-chaos/amis-core') {
  return 'vendor-amis-bridge'
}

// AMIS 相关的 host runtime chunks
if (includesAny(normalized, ['/src/amis/init.ts', '/src/amis/xuiComponents.ts'])) {
  return 'host-amis-bootstrap'
}

if (includesAny(normalized, ['/src/amis/adapter.ts', '/src/amis/providers.ts'])) {
  return 'host-amis-adapter'
}

if (includesAny(normalized, ['/src/amis/AmisRouteRenderer'])) {
  return 'host-amis-route-runtime'
}
```

#### 3.2 Flux 相关的 chunk 配置（未来）

```typescript
// Flux 相关的 vendor chunks
if (packageName.startsWith('@nop-chaos/flux-')) {
  if (packageName === '@nop-chaos/flux-core') {
    return 'vendor-flux-core'
  }
  if (packageName === '@nop-chaos/flux-runtime') {
    return 'vendor-flux-runtime'
  }
  if (packageName === '@nop-chaos/flux-react') {
    return 'vendor-flux-react'
  }
  return toChunkName('vendor-flux', packageName)
}

// Flux 相关的 host runtime chunks
if (includesAny(normalized, ['/src/flux/init.ts', '/src/flux/xuiComponents.ts'])) {
  return 'host-flux-bootstrap'
}

if (includesAny(normalized, ['/src/flux/adapter.ts', '/src/flux/providers.ts'])) {
  return 'host-flux-adapter'
}

if (includesAny(normalized, ['/src/flux/FluxRouteRenderer'])) {
  return 'host-flux-route-runtime'
}
```

### 4. 类型定义扩展

**文件**：`packages/shared/src/types/menu.ts`

```tsx
// 添加 Flux 页面类型
export interface MenuItem {
  id: string
  title?: string
  titleKey?: string
  path: string
  icon?: string
  children?: MenuItem[]
  badge?: string
  pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external'  // 添加 'flux'
  componentId?: string
  pluginUrl?: string
  schemaPath?: string
  frameSrc?: string
  externalUrl?: string
  roles?: string[]
  sort?: number
  hideInMenu?: boolean
}
```

### 5. 验证策略

#### 5.1 打包分析

```bash
# 构建并分析
pnpm build:analyze

# 检查关键 chunks
python scripts/analyze-main-chunks.py --focus vendor-amis
python scripts/analyze-main-chunks.py --focus host-amis

# 未来 Flux 验证
python scripts/analyze-main-chunks.py --focus vendor-flux
python scripts/analyze-main-chunks.py --focus host-flux
```

#### 5.2 运行时验证

1. **无 AMIS 页面的菜单**：
   - 打开浏览器 DevTools → Network
   - 访问应用，检查是否加载了 `vendor-amis*.js`
   - 预期：不应该加载任何 AMIS 相关的 chunks

2. **有 AMIS 页面的菜单**：
   - 访问应用，记录初始加载的 chunks
   - 点击进入 AMIS 页面，检查新加载的 chunks
   - 预期：只在访问 AMIS 页面时才加载 AMIS 相关的 chunks

3. **混合场景**：
   - 同时有 AMIS 和 Flux 页面
   - 分别访问不同类型页面，验证加载策略

#### 5.3 E2E 测试

**文件**：`tests/e2e/lazy-loading.spec.ts`（新建）

```typescript
import { test, expect } from '@playwright/test'

test('should not load AMIS chunks when menu has no AMIS pages', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 检查网络请求，不应该有 AMIS 相关的 chunks
  const amisRequests = await page.evaluate(() => {
    return performance.getEntriesByType('resource').filter((entry) =>
      entry.name.includes('vendor-amis') || entry.name.includes('host-amis')
    )
  })

  expect(amisRequests).toHaveLength(0)
})

test('should load AMIS chunks only when visiting AMIS page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 记录初始 chunks
  const initialResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name)
  )

  // 导航到 AMIS 页面
  await page.click('text=AMIS Demo')
  await page.waitForLoadState('networkidle')

  // 检查是否有新的 AMIS chunks 加载
  const newResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name)
  )

  const amisChunks = newResources.filter(
    (name) => name.includes('vendor-amis') || name.includes('host-amis')
  )

  expect(amisChunks.length).toBeGreaterThan(0)
})
```

## 实施计划

### Phase 1: AMIS 按需加载（当前）

1. ✅ 移除 `App.tsx` 中的同步 AMIS 初始化
2. ✅ 修改 `RouteRenderer.tsx` 为动态加载 AMIS
3. ✅ 创建 `useRuntimeCapabilities` hook
4. ✅ 更新 Vite 配置（如需要）
5. ✅ 添加验证测试

### Phase 2: Flux 按需加载（迁移期）

1. 创建 `apps/main/src/flux/` 目录结构
2. 实现 `FluxRouteRenderer` 组件
3. 更新 `RouteRenderer.tsx` 支持 `flux` pageType
4. 添加 Flux 相关的 Vite chunk 配置
5. 添加 Flux 预加载和验证测试

### Phase 3: 转换层集成（过渡期）

1. 实现 AMIS to Flux 转换层
2. 添加 `flux-converted` pageType
3. 支持混合模式（部分页面 AMIS，部分 Flux）
4. 渐进式迁移验证

### Phase 4: 完整迁移（未来）

1. 完全移除 AMIS 依赖
2. 统一使用 Flux runtime
3. 清理 AMIS 相关的代码和配置
4. 最终验证和性能优化

## 预期收益

1. **初始包体积减少**：不使用 AMIS 的应用初始包体积减少约 30-50%
2. **首屏加载时间**：减少 500ms - 1s（取决于网络条件）
3. **内存占用**：运行时内存占用减少
4. **迁移成本**：为未来的 Flux 迁移打下基础

## 风险和缓解

### 风险

1. **首次访问延迟**：AMIS 页面的首次访问需要加载 AMIS chunks
2. **网络抖动**：动态加载可能受网络影响
3. **兼容性问题**：某些 AMIS 组件可能依赖全局初始化

### 缓解策略

1. **预加载**：对于有 AMIS 页面的应用，在后台预加载 AMIS chunks
2. **缓存策略**：优化 chunk 缓存，减少重复加载
3. **降级处理**：提供加载失败时的降级方案
4. **监控**：添加性能监控，及时发现和解决问题

## 相关文档

- [Vite 动态导入](https://vitejs.dev/guide/build.html#dynamic-import-polyfill)
- [React.lazy](https://react.dev/reference/react/lazy)
- [打包分析工具](../scripts/analyze-main-chunks.py)
- [AMIS to Flux 迁移路线图](../README.md#迁移路线图)

## 后续优化

1. **Service Worker 缓存**：对 AMIS/Flux chunks 进行预缓存
2. **CDN 加速**：将大型 chunks 部署到 CDN
3. **压缩优化**：使用 Brotli 压缩减少传输体积
4. **Chunk 拆分优化**：进一步细分 AMIS/Flux chunks，实现更细粒度的按需加载
