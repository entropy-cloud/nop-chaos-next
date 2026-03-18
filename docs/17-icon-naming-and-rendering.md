# Icon 命名与渲染约定

> 本文档整理当前仓库内置 icon 的命名规范、alias 兼容策略与渲染方式。当前内置 icon 统一基于 Font Awesome，与 amis 默认图标体系保持一致。

---

## 1. 当前结论

- 内置 icon 统一走 Font Awesome
- 对外仍然保持 `name` 传值方式，不暴露底层图标库细节
- 支持 alias 机制，可把内部标准名或少量兼容名映射到标准 Font Awesome 名称
- 如果传入的是 `fa-home` 这种只有图标 class、没有基础 `fa` class 的值，内置控件会自动补齐基础 class

---

## 2. 通用入口

当前通用入口包括：

- `packages/core/src/utils/iconMap.tsx`
  - `iconRegistry`：业务标准名到标准 Font Awesome 名称的映射
  - `getIconByName()`：根据名称返回通用 icon 组件
  - `renderIcon()`：根据名称直接渲染 icon
- `packages/core/src/components/LowCodeIcon.tsx`
  - 通用 icon 组件，接收 `name`

调用侧只需要传 `name`，不需要关心底层是 Font Awesome 还是其他库。

---

## 3. 命名规范

### 3.1 业务标准名

当前业务标准名类型仍然是 `AppIconName`，定义在：

- `packages/shared/src/types/icon.ts`

风格约定：

- 全小写
- 多单词使用 `kebab-case`

例如：

- `home`
- `blocks`
- `git-branch`
- `layout-dashboard`
- `settings-2`

### 3.2 alias 兼容

当前允许传入以下几类名称：

- 业务标准名，例如 `layout-dashboard`
- Font Awesome 图标名，例如 `house`、`gear`
- Font Awesome class，例如 `fa fa-house`、`fa-solid fa-gear`、`fa-house`

不再特别兼容 Lucide 组件导出名这类 CamelCase 名称。

---

## 4. 自动补齐规则

内置 icon 渲染规则简化为：

1. 如果传入值能识别为业务标准名或历史 alias，则先映射到标准 Font Awesome 图标名
2. 如果传入值已经带 `fa` / `fas` / `far` / `fab` / `fa-solid` / `fa-regular` / `fa-brands` 这类基础 class，则直接使用
3. 如果传入值只有 `fa-house` 这种图标 class，没有基础 `fa` class，则自动补成 `fa fa-house`
4. 如果传入值只是 `house` 这种纯名称，则自动补成 `fa fa-house`
5. 无法识别时使用 fallback，默认是 `home`

---

## 5. 当前源码链路

### 5.1 shared 层

- `packages/shared/src/types/icon.ts`
  - 定义 `AppIconName`
  - 提供 `normalizeAppIconName()`，把历史名称归一到标准业务名

### 5.2 core 层

- `packages/core/src/utils/iconMap.tsx`
  - 把标准业务名和 alias 转成最终 Font Awesome class
- `packages/core/src/components/LowCodeIcon.tsx`
  - 组件化封装

### 5.3 菜单与低代码链路

- `packages/shared/src/utils/menuConfig.ts`
  - 菜单配置阶段会先做 icon 标准化校验
- `apps/main/src/services/menuMapper.ts`
  - 后端菜单字段会先归一成标准业务名
- `packages/core/src/components/Sidebar.tsx`
  - 最终通过 `renderIcon()` 渲染

---

## 6. 使用建议

### 6.1 配置型字段

对菜单、低代码、服务端配置字段，推荐优先使用标准业务名：

- `home`
- `plug-zap`
- `settings-2`

这样更利于统一校验和后续维护。

### 6.2 历史调用

如果现有代码已经是 `name='fa-home'` 或 `name='house'` 这种传法，通常不需要改调用点，交给内置 alias 和自动补齐处理即可。

### 6.3 手写页面图标

如果某个业务页面只是局部视觉元素，不走内置 icon 控件，也可以按需直接使用其他图标库。当前规则只约束“内置 icon 渲染链路”。

---

## 7. 后续建议

- 新增可配置 icon 时，优先补充到 `packages/shared/src/types/icon.ts`
- 同时在 `packages/core/src/utils/iconMap.tsx` 增加 alias 或标准映射
- 尽量统一使用标准业务名，避免引入新的非标准别名
