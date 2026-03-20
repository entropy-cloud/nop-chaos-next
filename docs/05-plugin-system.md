# 插件管理页面

> 本文档描述插件管理页面的功能和交互。

---

## 1. 页面目标

插件管理页面用于：
- 查看插件状态
- 启用或禁用插件
- 查看插件详情
- 修改插件运行配置

实现位置：`apps/main/src/pages/plugins/management/index.tsx`

---

## 2. 列表内容

每个插件卡片展示：
- 图标、名称、描述、版本号、 作者、 来源
- 更新时间、 启用状态

Mock 数据： `apps/main/src/services/mockApi/plugins.ts`

---

## 3. 页面交互

### 3.1 启用 / 禁用

- 使用 `Switch` 切换状态
- 切换前弹出确认框
- 确认后更新本地 store

### 3.2 查看详情

点击"查看详情"打开对话框，展示插件基础信息。

### 3.3 配置插件

点击"配置"打开对话框，根据 `configSchema` 渲染配置项。

---

## 4. 数据来源

- 查询：`fetchPluginList()` (`apps/main/src/services/mockApi/plugins.ts`)
- 状态管理：`usePluginStore()` (`apps/main/src/store/pluginStore.ts`)

---

## 5. 插件展示入口

- **插件管理页**：查看和配置插件
- **业务页面中的插件路由**：渲染插件内容（`pageType: 'plugin'`）

"插件已注册"与"插件已在页面中显示"是两个不同层次的概念。

---

## 6. 相关文档

- 插件开发规范：`docs/08-plugin-dev-guide.md`
- Extension 系统：`docs/15-extension-system.md`
