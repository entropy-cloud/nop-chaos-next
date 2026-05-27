# Skills Index

> `docs/skills/` 保存可复用的方法、提示词和工具使用方式。它回答“怎么做”，不替代 `docs/design/` 对当前项目状态的说明。

## Purpose

适合放进 `docs/skills/` 的内容：

- 通用分析方法
- 通用审查方法
- 如何使用仓库内现有脚本工具
- 可复用的 AI prompt / playbook

不适合放进 `docs/skills/` 的内容：

- 当前项目最终规范
- 当前项目最新架构边界
- feature 当前支持行为
- 执行计划

这些内容分别应放到：

- `docs/design/`
- `docs/plans/`
- `docs/logs/`

## Relationship To Other Docs

- `docs/design/`：当前项目的最新稳定规范
- `docs/source-of-truth-and-precedence.md`：说明哪个目录对哪个问题负责
- `scripts/`：真正可执行的分析与验证工具

## Skill Files

This index is intended to cover every reusable skill document in `docs/skills/`, excluding `README.md` itself.

- `index-routing-audit-prompt.md` - 审查 docs index / README / owner-doc 路由是否有效
- `main-bundle-dependency-governance.md` - bundle / dependency 通用分析方法与工具使用顺序
- `deep-audit-execution-framework.md` - 深度审计执行框架
- `unit-test-logic-and-contract-coverage-audit-prompt.md` - 单测逻辑与契约覆盖审查
- `code-refactor-prompt.md` - 代码重构提示
- `code-refactor-discovery-prompt.md` - 重构机会识别
- `react19-best-practices-review.md` - React 19 实践审查
- `next-gen-lowcode-attractor-discovery-prompt.md` - 低代码吸引子发现
- `doc-evaluation.md` - 文档评估
- `deprecated-feature-cleanup.md` - 废弃能力清理
- `branch-merge.md` - 分支合并
- `ai-tone-and-filler-review.md` - AI 语气与填充审查
- `code-quality-audit-prompt.md` - 代码质量审查
- `open-ended-adversarial-review-prompt.md` - 开放式对抗审查
