# Source Of Truth And Precedence

> 本文件定义“什么问题该看哪类文档”，用于避免把稳定规范、执行过程和历史记录混在一起。

## Purpose

当不同文档或代码信息同时存在时，本文件回答：

- 哪个目录对哪个问题负责
- 文档和代码冲突时该怎么判断
- 哪些内容应该沉淀为稳定 owner doc，哪些只应保留为执行或历史记录

## Precedence By Question

### What is the current supported behavior or current target state?

Primary source:

- `docs/design/`

Rule:

- `docs/design/` 同时承担当前仓库的稳定 app-layer 与 technical owner docs
- 只记录当前最新情况、当前目标状态、当前采用方案及其理由
- 不记录执行历史与演进过程

### How should a dependency or bundle issue be analyzed?

Primary source:

- `docs/skills/`

Rule:

- 通用方法、工具使用方式、分析顺序写在 `docs/skills/`
- 如果核心能力已经落实到脚本工具，skill 说明如何使用工具，不重复维护一套纸面规则

### What is the executable analysis truth for dependency and bundle governance?

Primary source:

- repository scripts under `scripts/`

Current examples:

- `scripts/analyze-main-package-graph.mjs`
- `scripts/check-main-external-runtime-deps.mjs`
- `scripts/analyze-main-chunk-graph.mjs`
- `scripts/main-bundle-utils.mjs`

Rule:

- 对可计算、可验证的 dependency / chunk 规则，以脚本工具为准
- 设计文档描述当前约束与选择理由，不替代工具实现

### How should a non-trivial slice be executed and closed?

Primary source:

- `docs/plans/`

Rule:

- `docs/plans/` 是执行契约，不是最终设计
- 关闭后，稳定结论应回流到 `docs/design/`，不是永远停留在 plan 中

### What actually happened during execution?

Primary source:

- `docs/logs/`

Support sources:

- `docs/testing/`
- `docs/bugs/`

Rule:

- `docs/logs/` 保留按日期组织的实现记忆
- `docs/testing/` 保留测试与验证记录
- `docs/bugs/` 保留复杂问题与根因说明

### Where do non-obvious regressions and root causes belong?

Primary source:

- `docs/bugs/`

Rule:

- bug 文档保留问题、根因、修复、回归风险
- 不承担当前规范正文角色

## Conflict Resolution

- If `docs/design/` and plans disagree: `docs/design/` owns the stable target/current baseline; update the design doc explicitly if the plan changed the supported baseline.
- If `docs/design/` and logs disagree: logs are history, design is the normative current state.
- If `docs/design/` and scripts disagree on executable dependency analysis behavior: inspect whether docs are stale or scripts are wrong, but do not silently trust prose over tools for computable rules.
- If live code and `docs/design/` disagree: treat it as either implementation drift or stale docs; do not silently choose one.
- If resolving the conflict changes user-visible behavior, public contract, permission behavior, runtime singleton policy, or deployment/integration behavior, stop and confirm intentionally.

## Rule Of Thumb

- stable current truth belongs in `docs/design/`
- reusable methods belong in `docs/skills/`
- executable verification belongs in scripts
- execution belongs in `docs/plans/` and `docs/logs/`
- problem memory belongs in `docs/bugs/`
