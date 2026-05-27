# Design Docs Guide

> `docs/design/` 是当前系统设计的权威说明，描述已经采用或明确决定采用的最终目标语义，不是执行计划，也不是历史记录。

## Purpose

`docs/design/` 用来回答：

- 当前系统应该是什么样
- 当前采用了哪种技术方案
- 关键边界、约束和契约是什么
- 如果存在多个技术可选项，为什么当前选择这一种

## What Belongs Here

适合放进 `design/` 的内容：

- 当前生效的系统边界
- 当前生效的 public contract / runtime contract
- 当前采用的架构分层
- 当前采用的实现约束
- 已做出选择的技术方案及选择理由
- 未来已明确决定、并应被视为目标状态的设计要求

## What Does Not Belong Here

不应放进 `design/` 的内容：

- 历史过程
- 调试笔记
- 一次性实验记录
- 执行步骤和待办事项
- 尚未决定的 proposal 列表
- 与脚本工具等价的重复“纸面规则副本”

这些内容应分别放到：

- `docs/logs/`：历史过程与轻量上下文
- `docs/bugs/`：问题、根因、修复记录
- `docs/plans/`：执行计划与状态跟踪
- `docs/skills/`：通用方法与如何使用工具

## Writing Rules

### 1. Must Reflect Latest Reality

`design/` 文档必须描述当前最新情况。

- 如果代码已经改变，文档必须同步到当前状态
- 如果旧设计已失效，不应继续保留旧版本叙述与当前状态并列

### 2. Target State, Not Changelog

文档应描述“当前目标和当前语义”，而不是“我们曾经怎么改到这里”。

不要写成：

- 先这样，后来那样，又改成这样

应写成：

- 当前采用什么
- 约束是什么
- 为什么这样选

### 3. Record Decision Rationale When There Were Real Alternatives

如果一个点存在多个真实可行技术选择，必须记录：

- 当前选择了什么
- 为什么选这个
- 为什么没选其他方向

不需要保留完整辩论史，但要保留足够的决策理由。

### 4. Do Not Duplicate Tool Logic Unnecessarily

如果核心分析能力已经落实到脚本工具：

- `design/` 只需要描述当前规则、边界和约束
- “如何分析、如何运行工具” 应写到 `docs/skills/`
- 不要在 `design/` 中维护与脚本完全重复的大段操作说明

## File Naming Guidance

- `*-spec.md`：当前生效的规则、约束、契约、系统说明
- `*.md`（feature/topic 名称）：页面或子系统设计说明
- 避免在 `design/` 中使用 `plan` 命名，因为 `plan` 在本仓库已有明确的执行文档含义

## Related Directories

- `docs/skills/`：通用方法，包含如何使用工具
- `docs/plans/`：执行计划，不是最终设计
- `docs/bugs/`：问题记录，不是当前规范
- `docs/logs/`：历史上下文，不是 source of truth
