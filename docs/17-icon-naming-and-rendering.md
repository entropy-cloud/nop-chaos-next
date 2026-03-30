# Icon 系统

> 本文档描述图标系统的实现方式和命名规范。

---

## 1. 概述

- 内置图标采用 **Lucide + FontAwesome 兼容策略**
- 对外保持 `name` 传值方式，不暴露底层图标库细节
- 支持 alias 机制映射到标准业务名与 FontAwesome 名称

---

## 2. 通用入口

| 文件 | 说明 |
|------|------|
| `packages/core/src/utils/iconMap.tsx` | `iconRegistry` 映射、`getIconByName()`/`resolveIcon()`/`renderIcon()` 渲染入口 |
| `packages/core/src/components/LowCodeIcon.tsx` | 通用 icon 组件 |
| `packages/shared/src/types/icon.ts` | `AppIconName` 类型定义 |

---

## 3. 命名规范

### 业务标准名

- 全小写、kebab-case
- 示例：`home`, `blocks`, `git-branch`, `layout-dashboard`, `settings-2`

### 支持格式

| 格式 | 示例 |
|------|------|
| 业务标准名 | `layout-dashboard` |
| FontAwesome 名 | `house`, `gear` |
| FontAwesome class | `fa fa-house`, `fa-solid fa-gear`, `fa-house` |

---

## 4. 渲染规则

1. 如果是显式 FontAwesome 形式（如 `fa-house`、`fa fa-house`、`fa-solid fa-gear`）→ 直接按 FontAwesome 渲染
2. 如果是普通 kebab-case 名称（如 `blocks`、`workflow`）→ 先尝试按 Lucide 图标名渲染
3. 如果 Lucide 未命中 → 走 FontAwesome alias 与 `iconRegistry` 映射
4. 无法识别 → 使用 fallback（默认 `home`）

---

## 5. 使用建议

### 配置型字段

优先使用标准业务名：
- `home`
- `plug-zap`
- `settings-2`

说明：标准业务名会经过 `normalizeAppIconName()` 归一化，再由 `iconRegistry` 落到具体实现。

### 菜单和低代码

菜单配置、后端字段归一后使用标准业务名。

### 自定义页面图标

局部视觉元素可直接使用其他图标库，不受此规则约束。

---

## 6. 扩展图标

新增可配置图标时：
1. 补充到 `packages/shared/src/types/icon.ts`
2. 在 `packages/core/src/utils/iconMap.tsx` 增加映射
