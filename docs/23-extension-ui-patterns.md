# 扩展模块 UI 交互规范

## 1. 目的

本文档定义扩展模块开发时必须遵循的交互模式规范。目标是：**主框架 + 本规范 + 业务需求** 即可快速产出扩展页面，且视觉感官和交互模式与宿主应用保持一致。

样式（颜色、圆角、阴影、hover 色值等）由主题系统自动处理，本文档不涉及具体样式值，只约束交互结构与组件选型。

适用范围：

- `apps/main` 中所有页面
- `examples/plugin-demo` / 任何远程插件
- 未来新增的业务扩展模块

## 2. 页面结构

### 2.1 文件组织

```
feature/
├── index.tsx          # 入口文件（列表/主页）
├── [id]/              # 动态详情路由
│   └── index.tsx
├── components/        # 子组件
├── types.ts           # 类型定义
├── utils.ts           # 纯逻辑工具函数
└── *.test.ts          # 单元测试
```

### 2.2 页面头部

每个页面必须使用 `<PageHeader>` 统一布局：

| 属性 | 用途 |
|------|------|
| `eyebrow` | 分类标签（如"数据管理"） |
| `title` | 页面标题 |
| `description` | 简短说明 |
| `actions` | 右侧操作按钮组 |

actions 区域使用 `<div className="flex flex-wrap gap-2">` 包裹按钮。

## 3. 列表页

### 3.1 布局（自上而下）

```
┌─────────────────────────────────────────┐
│ PageHeader (eyebrow + title + actions)  │
├─────────────────────────────────────────┤
│ FilterBar (搜索框 + 筛选器 + 高级筛选)   │
├─────────────────────────────────────────┤
│ Table (Card > TableHeader > TableBody)  │
├─────────────────────────────────────────┤
│ Pagination (总数 + 每页选择 + 翻页)      │
└─────────────────────────────────────────┘
```

### 3.2 筛选区

- **搜索框**：左侧，圆角容器内嵌 `<Search>` 图标 + `<Input>`，`Enter` 触发搜索
- **状态筛选**：`<Select>`，选项包含"全部" + 各业务状态
- **日期范围**：两个 `<Input type="date">` 中间"至"字
- **高级筛选**：`<Button variant="ghost">` 或 `variant="secondary"` 切换展开/收起

### 3.3 表格

- 使用 `<Card className="theme-card">` 包裹表格容器
- 表头使用 `<TableHeader>` + `<TableRow className={getTableRowClassName('default')}>`
- 数据行使用 `<TableRow className={getTableRowClassName('interactive')}>`，支持整行点击跳转详情
- 隔行变色、hover 效果由 `getTableRowClassName()` 和主题系统自动处理，禁止手动编写
- 选中行通过 `data-[state=selected]` 自动着色

### 3.4 行操作按钮

```
┌──────────────────────────────────────────────────────┐
│ ☑ │ 列数据...                    │ [查看] [⋯下拉菜单] │
└──────────────────────────────────────────────────────┘
```

- **主操作**：`<Button size="sm" variant="outline">` + Eye 图标 + "查看/编辑"
- **次要操作**：`<DropdownMenu>` 触发，包含"编辑"、"删除"等
- **下拉触发按钮**：`<Button size="icon-sm" variant="outline">` + `<MoreHorizontal>` 图标
- 行内按钮组使用 `<div className="flex justify-end gap-2">`
- 行内按钮 `onClick` 需 `e.stopPropagation()` 阻止行点击冒泡

### 3.5 批量操作

| 操作类型 | variant | 图标 | 位置 |
|---------|---------|------|------|
| 刷新 | `outline` | `RefreshCw` | PageHeader actions |
| 导出 | `outline` | - | PageHeader actions |
| 新建 | `default` | `Plus` | PageHeader actions |
| 批量删除 | `destructive` | `Trash2` | PageHeader actions |
| 已选数量 | 圆角标签 | - | CardHeader 右侧 |

### 3.6 分页

底部固定布局：

```tsx
<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
  <div>共 N 条记录</div>
  <div className="flex items-center gap-2">
    <Select value={String(pageSize)} onValueChange={...}>  // 5 / 10 / 20
    <Button size="sm" variant="outline" disabled={page<=1}>上一页</Button>
    <span>page / pageCount</span>
    <Button size="sm" variant="outline" disabled={page>=pageCount}>下一页</Button>
  </div>
</div>
```

## 4. 详情 / 编辑页

### 4.1 布局

```
┌─────────────────────────────────┐
│ PageHeader (含保存/刷新按钮)     │
├─────────────────────────────────┤
│ SummaryCard (关键信息摘要)       │
├─────────────────────────────────┤
│ Section Cards (分模块编辑)       │
│   - 每个 Card 独立编辑/恢复      │
├─────────────────────────────────┤
│ 返回按钮 (右下角)               │
└─────────────────────────────────┘
```

### 4.2 数据编辑模式

- **草稿模式**：加载后复制为 `draft`，所有修改在草稿上进行
- **脏状态跟踪**：分模块记录 `dirtySections`（如 `items`、`addresses`、`logistics`）
- **离开保护**：`beforeunload` 事件 + `window.confirm` 双层保护
- **保存策略**：支持全部保存和分模块恢复

### 4.3 验证与反馈

- 保存前集中验证，返回 `errors` 对象
- 有错误时 `toast.error()` 提示
- 字段级错误显示在 `<FormMessage>` 位置
- 成功保存 `toast.success()`

## 5. 按钮使用规范

| 场景 | variant | size | 图标位置 |
|------|---------|------|----------|
| 主要操作（保存/新建） | `default` | `default` | 左侧 |
| 次要操作（刷新/导出） | `outline` | `default` | 左侧 |
| 危险操作（删除） | `destructive` | `default` | 左侧 |
| 行内主操作 | `outline` | `sm` | 左侧 |
| 行内更多操作 | `outline` | `icon-sm` | MoreHorizontal |
| 幽灵按钮（筛选切换） | `ghost` | `sm` | 无 |
| 链接跳转 | `link` | - | 无 |
| 图标按钮 | `ghost` / `outline` | `icon` | 中心 |

## 6. 表单

### 6.1 标准结构

使用 react-hook-form + zod 集成：

```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>标签</FormLabel>
        <FormControl>
          <Input placeholder="提示文本" {...field} />
        </FormControl>
        <FormDescription>辅助说明</FormDescription>
        <FormMessage />   {/* 错误信息自动显示 */}
      </FormItem>
    )}
  />
</Form>
```

### 6.2 输入框内嵌图标

```tsx
<div className="relative">
  <User2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-10" value={...} onChange={...} />
</div>
```

### 6.3 提交按钮

- 全宽或右对齐，`type="submit"`
- `disabled={submitting}` 时文案变为"加载中..."
- 配合 `ArrowRight` 等图标指示方向

## 7. 弹窗 / 抽屉

| 场景 | 组件 | 适用情况 |
|------|------|----------|
| 二次确认 | `<AlertDialog>` | 删除确认、不可逆操作确认 |
| 简单表单编辑 | `<Dialog>` | 少量字段的新建/编辑 |
| 较多字段编辑 | `<Drawer>` 或 `<Sheet>` | 侧边编辑面板 |
| 详情查看 | `<Drawer>` | 侧边详情 |

弹窗结构统一：

```
DialogHeader    → title + description
DialogContent   → 表单字段（grid 布局）
DialogFooter    → 取消（variant="outline"）+ 保存（variant="default"）
```

取消按钮在左，保存按钮在右。

## 8. 主题系统集成

### 8.1 样式约定

- **禁止硬编码颜色**：使用 Tailwind 语义化类（`text-primary`、`bg-card`、`border-border`）
- **卡片统一类**：`<Card className="theme-card">`
- **行样式统一**：通过 `getTableRowClassName('interactive'|'default'|'subtle')` 获取
- **间距**：Tailwind 间距系统（`gap-2`、`space-y-4`、`p-4`）
- **圆角**：语义化类（`rounded-lg`、`rounded-xl`）

### 8.2 与主题的绑定方式

组件通过 `hsl(var(--primary))` 等 CSS 变量引用主题 Token。开发者只需使用组件库预设的 variant，无需关心具体色值。切换主题时 `data-theme` + `data-mode` 属性变化，CSS 变量自动切换。

## 9. 数据加载与反馈

| 状态 | 处理方式 |
|------|----------|
| 列表加载中 | React Query 管理；空数据用 `<Empty>` 组件 |
| 表单提交中 | 按钮 `disabled` + 文案变为"加载中..." |
| 操作成功 | `toast.success()` |
| 操作失败 | `toast.error()`，格式：`error instanceof Error ? error.message : '默认消息'` |
| 验证失败 | 字段级 `<FormMessage>` + 页面级 `toast.error()` |

## 10. 快速开发清单

扩展模块开发时，按以下清单逐项确认：

1. ✅ 文件组织遵循标准目录结构
2. ✅ 页面使用 `<PageHeader>`
3. ✅ 列表页：FilterBar + Table + Pagination
4. ✅ 表格行通过 `getTableRowClassName()` 获取样式
5. ✅ 行操作按钮遵循主操作 + 下拉菜单模式
6. ✅ 按钮 variant/size 按规范选择
7. ✅ 表单使用 `<FormField>` 组件树
8. ✅ 弹窗使用 Dialog / Drawer / AlertDialog
9. ✅ 卡片使用 `theme-card` 类
10. ✅ 所有反馈使用 `toast`

遵循以上规范，新增页面只需关注业务逻辑，视觉和交互一致性由框架 + 主题系统保证。

