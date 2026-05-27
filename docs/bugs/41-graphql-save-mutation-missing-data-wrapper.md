# 41 GraphQL Save Mutation Missing Data Wrapper

## Problem

- `pnpm dev` 联调真实后端时，登录后在通用 CRUD 页面执行新增或修改提交会失败。
- 后端返回错误 `参数[data]不能为空`，典型出现在 `save` / `update` 类 GraphQL mutation。
- 页面本身能正常打开、查询也正常，只有提交链路失败。

## Diagnostic Method

- 先区分了仓库内 mock/preview 路径和真实 `pnpm dev` 联调路径，确认问题只在真实后端交互时出现。
- 再检查 `apps/main` 的 HTTP 封装与 `packages/amis-core` 的 GraphQL 请求转换，发现查询类请求正常，而 mutation 变量构造值得怀疑。
- 随后用 Playwright 直连真实控制台（`4173 -> 8080` 代理链路），登录 `nop/123`，进入 `部门` CRUD 页并抓取 `/graphql` 请求。
- 修复后再次用 Playwright 复测，确认真实新增请求已变成 `mutation NopAuthDept__save($data:Map)` 且 `variables.data` 正确携带表单字段，现场请求成功返回新记录 id。

## Root Cause

- 根因在 `packages/amis-core/src/core/graphqlArgs.ts` 的 `Map` 参数构造逻辑。
- 对 `save` / `update` / `saveOrUpdate` / `upsert` / `copyForNew` 这类声明为 `data: Map` 的操作，前端之前直接从 `data['data']` 读取变量值。
- 但大量 AMIS 表单 schema 把字段作为顶层表单值提交，而不是显式包成 `{ data: {...} }`，导致最终 GraphQL 请求里的 `variables.data` 为 `undefined`，后端因此报 `参数[data]不能为空`。

## Fix

- 在 `packages/amis-core/src/core/graphqlArgs.ts` 中调整 `argMap()`：当目标参数名为 `data` 且调用方没有显式提供 `data` 字段时，自动把顶层表单字段打包为 `variables.data`。
- 该打包逻辑会继续过滤 `__`、`@`、`v_` 这类运行时特殊字段，避免把内部控制参数误传给后端。
- 这样保留了显式 `{ data: ... }` 的调用方式，同时兼容当前真实 CRUD schema 普遍使用的“顶层表单字段直接提交”模式。

## Tests

- `packages/amis-core/src/core/graphqlArgs.test.ts` - 新增回归用例，验证 save-style `Map` 参数会把顶层表单字段包装到 `data` 下。
- `packages/amis-core/src/core/graphql.test.ts` - 新增转换层回归用例，验证 `@mutation:...__save` 会生成带 `variables.data` 的 GraphQL 请求。
- Playwright 联调复测 - 真实 `部门` 页面新增提交抓包确认 `variables.data` 存在，后端返回成功结果。

## Affected Files

- `packages/amis-core/src/core/graphqlArgs.ts`
- `packages/amis-core/src/core/graphqlArgs.test.ts`
- `packages/amis-core/src/core/graphql.test.ts`

## Notes For Future Refactors

- 不要假设所有表单 schema 都会手动构造 `{ data: ... }` 包装；GraphQL 适配层需要兼容顶层表单值提交。
- `save` / `update` 一类 mutation 的参数约定属于跨包合同，改动时必须同时检查真实后端联调而不只是 mock 测试。
- 遇到“查询正常、提交失败”的 GraphQL 问题时，优先抓 `variables`，不要只看最终 query 文本。
