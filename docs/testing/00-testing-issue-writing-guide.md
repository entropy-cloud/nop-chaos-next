# Manual Test Issue Writing Guide

人工测试问题按日期记录，每天一个文件。

## Purpose

每份文档用于记录人工诊断或人工测试中发现的问题，包括：

- UI 和交互问题
- 功能缺陷
- 与预期行为不一致的表现

## Rules

- **One file per day** - 同一天发现的问题记录到同一个文件
- **Append new entries** - 新问题按正序追加到文件末尾
- **Sequential numbering** - 问题编号持续递增，同一文件内不重置
- **Keep entries concise** - 描述尽量短、可复现、可定位

## Path Convention

- `docs/testing/{year}/{month}-{day}.md`

## Entry Format

```markdown
# Manual Test Issues - YYYY-MM-DD

## N. Short issue title

- **所属模块**: 页面、组件或模块名称
- **问题描述**: 具体表现，必要时附最小复现步骤
- **预期行为**: 正确行为
- **发现方式**: 人工诊断 / 人工测试 / 探索性测试 / 回归验证
- **状态**: 待修复 / 已修复 / 已确认 / 不予修复
```

## Adding A New Entry

1. 打开 `docs/testing/{year}/{month}-{day}.md`，不存在则创建。
2. 在文件末尾追加新的 `## N. 问题标题` 条目。
3. 填写模块、问题描述、预期行为、发现方式和状态。
