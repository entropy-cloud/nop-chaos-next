# 项目文档索引

> 本目录当前只保留现行规范和联调说明。历史迁移方案已删除，避免与当前实现混淆。

---

## 1. 现行文档

这些文档和当前仓库实现基本一致，可作为开发和联调的主要参考。

| 文件 | 内容 | 说明 |
|------|------|------|
| [01-dashboard.md](./01-dashboard.md) | Dashboard 页面设计 | 指标卡片、图表、事件列表、时间过滤、插件挂载区 |
| [02-ai-workbench.md](./02-ai-workbench.md) | AI 工作台设计 | 会话列表、消息面板、助手切换、上下文开关、流式输出 |
| [03-flow-editor.md](./03-flow-editor.md) | Flow Editor 设计 | 画布交互、节点类型、连线编辑、工具栏、历史记录 |
| [04-master-detail.md](./04-master-detail.md) | 主子表 CRUD 设计 | 主列表、详情页、三种子表编辑模式、保存与校验 |
| [05-plugin-system.md](./05-plugin-system.md) | 插件管理页说明 | 侧重插件管理页面交互，不作为插件架构主规范 |
| [06-layout-settings.md](./06-layout-settings.md) | 布局设置设计 | 侧边栏宽度、多标签导航、移动端顶部栏、持久化 |
| [08-plugin-dev-guide.md](./08-plugin-dev-guide.md) | 插件开发规范 | 插件依赖边界、bridge、SystemJS 构建、开发联调 |
| [09-style-interaction-guidelines.md](./09-style-interaction-guidelines.md) | 样式与交互规则 | hover、pointer、sidebar、table、第三方样式边界 |
| [12-amis-helper-css-conflict.md](./12-amis-helper-css-conflict.md) | amis 样式冲突说明 | `helper.css` 与 Tailwind 的冲突、当前规避方案 |
| [15-shell-contribution-esm-design.md](./15-shell-contribution-esm-design.md) | Contribution ESM 设计 | 宿主通过 ESM 加载业务 contribution 扩展 |
| [16-nop-chaos-integration-checklist.md](./16-nop-chaos-integration-checklist.md) | 真实后端联调清单 | auth、menu、amis page/dict、联调顺序与排查建议 |
| [17-icon-naming-and-rendering.md](./17-icon-naming-and-rendering.md) | Icon 规范 | 标准名、alias、Font Awesome 渲染规则 |
| [18-amis-theme-bridge.md](./18-amis-theme-bridge.md) | amis 主题桥接方案 | 主题变量映射、弹层适配、样式修补 |
| [22-contribution-generator.md](./22-contribution-generator.md) | contribution 生成器 | 新建 contribution 脚手架、联调命令与后续修改点 |
| [20-shell-reuse-boundaries.md](./20-shell-reuse-boundaries.md) | 主框架复用边界 | page component 替换与 shell contribution 配置的职责划分 |
| [21-shell-reuse-implementation-plan.md](./21-shell-reuse-implementation-plan.md) | 主框架复用实现计划 | shell runtime config、branding、system page override 的详细落地方案 |

---

## 2. 当前需要特别注意的文档

这些文档仍有参考价值，但阅读时要注意其定位或与其他文档的关系。

| 文件 | 当前状态 | 说明 |
|------|----------|------|
| [05-plugin-system.md](./05-plugin-system.md) | 与 `08` 有重叠 | 主要保留插件管理页层面的说明，插件架构以 `08` 为准 |
| [07-mock-data.md](./07-mock-data.md) | 已按当前实现修订 | 以 `apps/main/src/services/mockApi/*` 和 `dev:mock` 命令为准 |
| [19-contribution-host-mode-shim-design.md](./19-contribution-host-mode-shim-design.md) | 设计提案，未落地 | contribution 在 `dev` / `dev:host` 双模式下复用宿主共享运行时的候选方案 |

---

## 3. 阅读建议

- 看页面功能时，优先读 `01` 到 `06`
- 看插件体系时，优先读 `08`，再按需参考 `05`
- 看 amis 集成时，优先读 `12`、`18`，联调时再看 `16`
