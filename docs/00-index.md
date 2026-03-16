# 前端框架交互细节补充文档 - 索引

> 本文档系列整理自 `frontend-shell.md` 中相比 `frontend-shell-v2.md` 额外的交互细节描述，用于指导具体功能实现。

---

## 文档结构

| 文件 | 内容 | 说明 |
|------|------|------|
| [01-dashboard.md](./01-dashboard.md) | 仪表盘详细设计 | 指标卡片、图表、事件列表、时间过滤 |
| [02-ai-workbench.md](./02-ai-workbench.md) | AI 工作台详细设计 | 会话列表、对话区域、助手类型、流式输出 |
| [03-flow-editor.md](./03-flow-editor.md) | 流程编排详细设计 | 画布交互、节点类型、连线编辑、快捷键、浮动工具栏 |
| [04-master-detail.md](./04-master-detail.md) | 主子表管理详细设计 | 三种编辑模式、保存验证、批量操作 |
| [05-plugin-system.md](./05-plugin-system.md) | 插件管理详细设计 | 插件列表、通信能力、plugin-demo |
| [06-layout-settings.md](./06-layout-settings.md) | 布局设置详细设计 | 侧边栏宽度配置、标签页导航、交互细节 |
| [07-mock-data.md](./07-mock-data.md) | Mock 数据要求 | 数据类型、控制方式 |
| [08-plugin-dev-guide.md](./08-plugin-dev-guide.md) | 插件开发规范 | 依赖边界、bridge 设计、开发态联调、SystemJS 构建 |
| [11-amis-react-implementation-plan.md](./11-amis-react-implementation-plan.md) | Amis React 落地方案 | 包结构、接口设计、路由模型、Phase 1 文件清单与测试建议 |

---

## 通用视觉要求

以下要求适用于所有模块：

### 玻璃拟态效果（Glassmorphism）

- 卡片、弹窗、侧边栏等组件需要支持玻璃拟态风格
- 实现方式：通过全局 CSS 变量（如 `--glass-background`, `--glass-blur`）定义
- 组件通过添加预设类（如 `glass`）应用这些变量
- 特点：半透明背景、模糊效果、悬浮感阴影、渐变边框

### 主题色跟随

- 所有组件需要支持主题色
- 图表配色需要与主题风格协调
- 第三方组件（Recharts、@xyflow/react）需要响应主题变化

### 交互反馈

- 所有操作需要有明确的视觉反馈
- 使用 toast 通知提示操作结果
- 危险操作需要二次确认
