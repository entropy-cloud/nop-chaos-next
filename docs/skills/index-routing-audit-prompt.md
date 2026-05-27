# Index Routing Audit Prompt

> 用于审查文档索引、目录入口和 owner-doc 路由是否真的能把人或 AI 导到正确文档，而不是只停留在“有一个 index 文件”。

## When To Use

在以下场景优先使用：

- 新建或大幅重构 `docs/` 树后
- `docs/index.md` 已经变大，但经常找不到该看的文档
- 新增了 `design/`、`skills/`、`plans/`、`bugs/` 等目录说明后，想验证路由是否仍然清晰
- 准备把当前 docs 治理模式复制到别的项目之前

## Audit Prompt

```text
You are auditing the routing effectiveness of a documentation index structure.

## Step 1 — Read the router files

Read:
- `docs/index.md`
- any sub-index or README it links to (for example `docs/design/index.md`, `docs/skills/README.md`)
- `docs/source-of-truth-and-precedence.md` if present

For each indexed entry, record:
- the stated purpose or task scenario
- the path it points to
- whether the target file exists
- whether the target content matches the stated purpose

Return a coverage table with columns:
| entry | stated purpose | target path | exists | matches purpose | notes |

Flag any entry where:
- the target file does not exist
- the target exists but does not match the stated purpose
- the stated purpose is too vague for a reader to decide whether it applies
- multiple entries point to the same target but describe it differently
- an important owner doc exists but is not reachable from the routing surface

## Step 2 — Persona-based routing test

Simulate realistic information needs and trace the shortest path from the docs router to the answer.

Persona A — AI agent starting a task:
- Need: "What rules do I have to follow before editing code?"
- Need: "Where is the current stable spec for [technical area]?"

Persona B — engineer debugging a regression:
- Need: "Where do I find the bug note or past failure history for this area?"
- Need: "Which artifact wins if docs and implementation disagree?"

Persona C — maintainer updating docs:
- Need: "Should this go into design, skill, plan, bug, or log?"
- Need: "How do I verify the docs routing still works after restructuring?"

Persona D — reviewer checking closure:
- Need: "Where are the latest implementation logs?"
- Need: "Where is the stable owner doc and where is the execution history?"

For each persona need, return:
| persona | need | starting point | hops | found | path taken | problem |

If a persona cannot reach the answer through the docs router alone, record the failure point and what was missing.

## Step 3 — Structural quality checks

Check for:
- orphan files: files that should be discoverable but are not routed from index/readme files
- stale references: links to moved, renamed, or deleted files
- depth imbalance: actionable content that takes too many hops from `docs/index.md`
- duplication: the same routing rule or directory responsibility restated in multiple places without clear precedence
- category confusion: documents whose content belongs in a different directory than where the router places them
- missing sub-indexes: directories with enough files that they should have their own README or index

## Step 4 — Return findings

Return findings ordered by severity.

For each finding include:
- title
- affected path or index entry
- current routing gap
- impact on routing effectiveness
- recommendation

If no findings remain, say that explicitly and note residual risks.
```

## Notes

- This skill audits docs routing, not frontend page routing.
- For bundle/dependency analysis, use `main-bundle-dependency-governance.md`.
- For exploratory page/router behavior testing, prefer the project's testing prompts or E2E workflow.
