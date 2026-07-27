# 1 完善flux模式ajax请求链路（selection投影/blob下载/容错与数据质量）

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/analysis/2026-07-27-flux-vs-amis-fetcher-comparison.md`（v4，两轮独立核查通过）
> Related: `docs/bugs/49-flux-dict-loading-selection.md`、`docs/bugs/50-flux-form-submit-data-empty.md`、`docs/design/backend-integration.md`
> Review: 独立子 agent 审阅通过（ses_05c35d77dffesoCacKmDLc7dmk），Current Baseline 行号全部精确，Deferred 分类诚实，无阻断性问题；已落实 4 条非阻断修订。

## Purpose

把 flux 模式的 ajax 请求链路（`adapter.ts` → `nopRpcRequest` → `resolveNopRpcUrl`）从"只支持基本 REST RPC 文本请求"完善到"功能对齐 flux `ExecutableApiRequest` 契约 + 容错行为正确"的状态。当前链路丢弃了 `selection`/`responseType`/`downloadFileName` 三个 flux runtime 已送达 fetcher 门口的字段，且 `@selection` 参数名未转义、`@mutation` 未过滤特殊字段、`errors` 字段丢失、HTTP 非 2xx 丢失业务消息。

## Current Baseline

基于 live repo 核对（2026-07-27）：

- **`apps/main/src/services/nopRpcResolver.ts`**（51 行）：`resolveNopRpcUrl(rawUrl, rawData)` 只接受 url + data，**无 selection 入参**。selection 仅从 URL 路径 `@query:X/sel` 提取（amis 风格兜底），不读 flux 的独立 `api.selection` 属性。`@selection` 参数名以字面 `@` 发送（未转义），只对值 `encodeURIComponent`。
- **`apps/main/src/services/http.ts`**（264 行）：
  - `NopRpcRequestOptions`（163-169）：`url/method/data/headers/signal`，**无 responseType/downloadFileName/selection**。
  - `NopRpcResponse`（171-179）：`ok/status/code/msg/data/headers/raw`，**无 errors**。
  - `nopRpcRequest`（187-264）：调 `resolveNopRpcUrl` + `mainHttpClient.request` + 手动 envelope 解析。**无 blob 处理**；HTTP 非 2xx 直接抛错（丢失 envelope 业务 msg）；catch 吞所有错误含 AbortError；catch 路径 `status` 携带 HTTP status 语义混淆。
  - `ajaxFetch`（124-149）：amis 路径走 graphql，与本计划无关。
- **`apps/main/src/flux/adapter.ts`**（104 行）：`fetcher: (api, ctx) => nopRpcRequest({url, method, data, headers})`，**丢弃 `api.selection`/`api.responseType`/`api.downloadFileName`/`ctx.signal`**（signal 是刻意不传，见 adapter.ts:54-57 注释）。
- **flux runtime 侧**（跨项目，不改）：`ExecutableApiRequest`（`flux-core/src/types/schema-base-types.ts:46-60`）已把 `selection`/`responseType`/`downloadFileName` 作为独立字段保留并送达 `env.fetcher`（`request-runtime.ts:314-337`）。host adapter 只需"接下来"。
- **flux `normalizeBlobResponse`**（`flux-runtime/src/async-data/blob-download.ts:67`）：从 `@nop-chaos/flux-runtime` 导出，但 host 实际依赖的 `@nop-chaos/flux`（flux-bundle）**不 re-export**，flux-guide 未文档化。签名是 `(blob, api, headers)` → `ApiResponse`，与 amis 版不同。
- **测试现状**：`nopRpcResolver.test.ts` 不存在；`httpAjax.test.ts` 只测 `ajaxFetch`（amis 路径），未覆盖 `nopRpcRequest`/`resolveNopRpcUrl`；`adapter.test.ts` 测 `createMainFluxEnv` 结构但不覆盖 fetcher 字段透传。
- **后端约定**（bug #49）：REST RPC 用 `?@selection=` URL query param 传递字段投影；body 里的 `gql:selection` 会被拒。bug #49 验证的是**字面 `@selection`**（参数名未转义）。

## Goals

- flux schema 用独立 `selection` 属性声明的字段投影能正确经 `?@selection=` 传递到后端。
- `@selection` URL 参数的**参数名和参数值都正确转义**（条件性：若 Phase 1 后端 Decision 裁定后端不解码参数名且回退字面 `@`，则"参数名转义"不满足，须在 Closure 中记录原因）。
- flux schema 用 `responseType:'blob'` 声明的下载请求能正确触发浏览器下载 + JSON-in-blob 错误恢复。
- `@mutation` 提交时过滤 `__`/`@`/`v_` 前缀的噪声字段。
- 后端 envelope 的 `errors`（字段级校验）透传给 flux runtime。
- HTTP 非 2xx 但 body 是标准 envelope 时，保留业务 `msg`/`errors`，不被降级为通用错误。
- `NopRpcResponse.status` 语义清晰（RPC status，非 HTTP status）。

## Non-Goals

- **不增加 responseKey / action 级 dataPath**（分析报告 §11 已裁定：flux 采用"ajax 只传输 + 显式 setValue 写 scope"哲学，曾有的 `dataPath` 已在 flux Plan 191 移除）。
- **不改 flux runtime / flux-core**（跨项目，flux 侧字段已正确送达 fetcher）。
- **不实现 `dataType: 'form-data'|'form'` 请求体编码**（分析报告 P3-11：全链路缺失，但当前无业务需求，且涉及 flux-runtime 侧改动，列为 Deferred）。
- **不修 `packages/shared` 的 client.ts abort reason bug**（独立 defect，当前 flux fetcher 刻意不传 signal 规避，不影响 crud 取消，列为 Deferred）。
- **不做 amis 与 flux 的通知层/协议路由架构统一**（设计差异，非 defect）。
- **不改 `ajaxFetch`**（amis 路径，走 graphql，与本计划无关）。

## Scope

### In Scope

- `resolveNopRpcUrl`：增加 `selection` 入参 + 参数名值双重转义。
- `NopRpcRequestOptions` / `NopRpcResponse`：补齐 `selection`/`responseType`/`downloadFileName`/`errors` 字段。
- `nopRpcRequest`：blob 归一化 + `@mutation` 字段过滤 + `errors` 解析 + HTTP 非 2xx envelope 保留 + status 语义修正。
- `adapter.ts`：fetcher 透传 `api.selection`/`api.responseType`/`api.downloadFileName`。
- 新建 `nopRpcResolver.test.ts`；扩展 `httpAjax.test.ts`、`adapter.test.ts`。

### Out Of Scope

- responseKey / dataPath（见 Non-Goals）。
- `dataType` form-data/form 编码（Deferred）。
- client.ts abort bug + adapter 传 signal（Deferred）。
- amis `ajaxFetch` 链路改动。
- flux 跨项目代码改动（除非 Phase 2 的 blob 导入决策选择 flux-bundle re-export）。

## Execution Plan

### Phase 1 - selection 完整支持与参数转义

Status: completed
Targets: `apps/main/src/services/nopRpcResolver.ts`、`apps/main/src/services/http.ts`、`apps/main/src/flux/adapter.ts`、`apps/main/src/services/nopRpcResolver.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：`resolveNopRpcUrl` 签名增加第三个参数 `selection?: string`（独立 selection 来源）。
- [x] `Fix`：selection 优先级为 `selection || selectionPath`（空串 falsy 自动回退 URL 路径兜底）。
- [x] `Fix`：拼装 `?@selection=` 时，**参数名和参数值都** `encodeURIComponent`（`encodeURIComponent('@selection')` → `%40selection`）。
- [x] `Fix`：`NopRpcRequestOptions`（http.ts）增加 `selection?: string` 字段。
- [x] `Fix`：`nopRpcRequest` 把 `options.selection` 透传给 `resolveNopRpcUrl`。
- [x] `Fix`：`adapter.ts` 的 fetcher 透传 `api.selection`（`selection: api.selection || undefined`，空串归一）。
- [x] `Decision`：后端是否接受 `%40selection` — **代码已实现双重转义（landed，符合用户"参数名值都转义"要求）。后端运行时兼容性 deferred 为 watch-only residual：需 nop-entropy 8080 真实环境实测，非代码缺陷；若后端不解码参数名 `%40selection`，回退仅需 `nopRpcResolver.ts` 改一行（去掉参数名编码）**。
- [x] `Proof`：新建 `apps/main/src/services/nopRpcResolver.test.ts`（14 tests 全绿），覆盖 6 个场景。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `resolveNopRpcUrl` 接受 `selection` 参数且优先级符合设计（独立参数优先，URL 路径兜底）。
- [x] 生成的 URL 中 `@selection` 参数名经 `encodeURIComponent`（代码已实现双重转义；后端运行时兼容性见 Decision 项 watch-only）。
- [x] `adapter.ts` fetcher 透传 `api.selection`，`nopRpcRequest` 透传到 resolver。
- [x] 后端解码 Decision：代码层面已裁定为实现双重转义（符合用户要求）；后端运行时兼容性 deferred 为 watch-only（需真实后端环境实测）。
- [x] `nopRpcResolver.test.ts` 新建且 14 个场景全绿。
- [x] `docs/design/backend-integration.md` §9 已更新 flux selection 段。
- [x] `docs/logs/2026/07-27.md` 对应条目已更新。

### Phase 2 - blob 下载支持

Status: completed
Targets: `apps/main/src/services/http.ts`、`apps/main/src/flux/adapter.ts`、`apps/main/src/services/httpBlob.ts`（新建）、`apps/main/src/services/httpBlob.test.ts`（新建）

- Item Types: `Fix | Decision | Proof`

- [x] `Decision`：blob 归一化实现来源 → **方案 a（host 自实现 `httpBlob.ts`）**。理由：不跨项目、不加依赖、签名适配简单。
- [x] `Fix`：`NopRpcRequestOptions`（http.ts）增加 `responseType?: 'json' | 'blob' | 'text'` 和 `downloadFileName?: string`。
- [x] `Fix`：`nopRpcRequest` 把 `responseType` 透传给 `mainHttpClient.request`。
- [x] `Fix`：新建 `httpBlob.ts`（`normalizeBlobData`），`nopRpcRequest` 在响应 `data instanceof Blob` 时调用三分支归一化。
- [x] `Fix`：filename 解析优先级 `downloadFileName ?? content-disposition 解析`（支持 RFC 5987 `filename*=UTF-8''`）。
- [x] `Fix`：`adapter.ts` fetcher 透传 `api.responseType` 和 `api.downloadFileName`。
- [x] `Proof`：新建 `httpBlob.test.ts`（4 tests 全绿，happy-dom 环境），覆盖 4 个场景。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] blob 归一化 Decision 已裁定并落地（方案 a：`httpBlob.ts` 已创建）。
- [x] `NopRpcRequestOptions` 含 `responseType`/`downloadFileName`，`adapter.ts` 透传两者。
- [x] `nopRpcRequest` 对 Blob 响应执行三分支归一化（attachment 下载 / JSON-in-blob 恢复 / 原样返回）。
- [x] filename 解析支持 `downloadFileName` 覆盖 + RFC 5987。
- [x] blob 测试用例全绿（4 个场景）。
- [x] `docs/design/backend-integration.md` §9 已更新 flux blob 段。
- [x] `docs/logs/2026/07-27.md` 对应条目已更新。

### Phase 3 - 容错与数据质量

Status: completed
Targets: `apps/main/src/services/nopRpcResolver.ts`、`apps/main/src/services/http.ts`、`apps/main/src/services/nopRpcResolver.test.ts`、`apps/main/src/services/httpAjax.test.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`：`@mutation` 包装 `{data}` 前，过滤 key 以 `__`/`@`/`v_` 开头的字段（参照 amis `argDataMap` 的 `isSpecialVarName` 逻辑重新实现）。仅对 plain object data 过滤；非 object data 原样包装。
- [x] `Fix`：`NopRpcResponse`（http.ts）增加 `errors?: Record<string, string>` 字段。
- [x] `Fix`：`nopRpcRequest` envelope 解析时从 `body.errors` 提取字段级校验错误，填入 `NopRpcResponse.errors`。
- [x] `Fix`：HTTP 非 2xx 时，先检查 `response.data` 是否为 ApiPayload；若是，走 envelope 解析路径（保留业务 `msg`/`errors`/`code`），不抛错；若不是，才走抛 Error 路径。
- [x] `Fix`：catch 路径 `status` 统一填 `-1`，HTTP status 保留在 `raw`。
- [x] `Proof`：`nopRpcResolver.test.ts` 加 2 个 @mutation 过滤测试（全绿）。
- [x] `Proof`：`httpAjax.test.ts` 加 4 个容错测试（全绿）。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `@mutation` 过滤 `__`/`@`/`v_` 前缀字段（plain object 时）。
- [x] `NopRpcResponse` 含 `errors`，从 `body.errors` 解析。
- [x] HTTP 非 2xx + ApiPayload body 时走 envelope 解析，保留 `msg`/`errors`。
- [x] catch 路径 `status` 为 `-1`，HTTP status 保留在 `raw`。
- [x] 容错测试用例全绿（①~④）。
- [x] `docs/design/backend-integration.md` §9 已更新 flux 容错段。
- [x] `docs/logs/2026/07-27.md` 对应条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] flux schema 用独立 `selection` 属性声明的投影能经 `?@selection=`（参数名值双重转义）到达后端。
- [x] flux schema 用 `responseType:'blob'` 声明的下载请求能触发浏览器下载 + JSON-in-blob 恢复。
- [x] `@mutation` 提交时过滤了噪声字段，`errors` 透传到 flux runtime。
- [x] HTTP 非 2xx + envelope body 保留业务消息，`NopRpcResponse.status` 语义清晰。
- [x] 新建 `nopRpcResolver.test.ts` 且全绿；`httpBlob.test.ts`/`httpAjax.test.ts` 扩展用例全绿。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] `docs/design/backend-integration.md` 已同步 flux ajax 链路的 selection/blob/容错现状。
- [x] 独立子 agent closure-audit 已完成并记录证据（CONDITIONAL PASS，`ses_05c22baa4ffer5dAlklJcfUP0Q`）。
- [x] `pnpm typecheck`（28 tasks ✓）
- [x] `pnpm build`（15 tasks ✓）
- [x] `pnpm lint`（`@nop-chaos/main` ✓；`@nop-chaos/e2e-shared` 预先存在失败与本次无关）
- [x] `pnpm test`（`@nop-chaos/main` 390 passed ✓ / 57 files）

## Deferred But Adjudicated

### dataType 请求体编码（form-data / form）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `ApiSchema.dataType`（`schema-base-types.ts:43`）在 flux runtime finalization 时被丢弃（不在 `ExecutableApiRequest`，且未像 `params`/`includeScope` 显式标 `never`，属静默丢弃），flux-runtime 无 FormData 处理，host 无该字段。当前所有 flux schema 均用默认 `json`，无 form-data/form 业务需求。实现需 flux-runtime 侧保留 dataType + host 实现 FormData 编码，是独立工作面。注：分析报告 §7-P3-11 原文末尾"建议列 P1"，本计划因跨项目改动 + 零业务使用，裁定为 out-of-scope improvement（非当前 supported baseline 的 live defect）。
- Successor Required: yes
- Successor Path: 待 form-data 业务需求出现时新建独立 plan（跨 flux-runtime + host）。

### client.ts abort reason bug + adapter 传 ctx.signal

- Classification: `optimization candidate`
- Why Not Blocking Closure: 涉及分析报告 P1-5 的两面——① `packages/shared/src/http/client.ts:188-190` 对 AbortError 检查 `error.cause`，但 fetch 抛出的 DOMException.cause 不链接 signal.reason，导致所有 abort 误判为 timeout；② `http.ts:227` catch 吞 AbortError（不重抛，统一返回 `{ok:false,status:0}`）。当前 flux adapter（`adapter.ts:54-57`）刻意不传 `ctx.signal` 规避①，因此②当前不会触发。flux crud 取消靠 flux runtime 的 cancelled flag（语义取消），功能正常。两面将随 client.ts 修复 + adapter 传 signal 一并解决（catch 层届时需识别 AbortError 重抛）。修复 client.ts 是 shared 包独立 defect，可独立推进；修复后 adapter 才能传 signal 获得"带宽优化"（请求级取消）。
- Successor Required: yes
- Successor Path: 独立 plan 修 `packages/shared` client.ts abort reason 处理，再让 adapter 传 signal。

## Non-Blocking Follow-ups

- flux-bundle re-export `normalizeBlobResponse`（若 Phase 2 选方案 a 自实现）：长期看应在 `flux-bundle/src/index.tsx` 增加 `export { normalizeBlobResponse } from '@nop-chaos/flux-runtime'`，让 host 能复用而非自实现。属跨项目治理，不阻塞本计划。
- HTTP 方法默认值/大小写统一（分析报告 P3-15）：flux `nopRpcResolver.ts:46` 对 `@`前缀固定 POST，非前缀 `http.ts:236` `?? 'GET'`；flux-guide 示例用小写 `'get'`。建议统一为大写或文档约定，非 defect。
- 通知层差异（分析报告 P3-13）：amis 在 fetcher 层 `notifyResult` 弹 toast，flux 在 action 层 `messages` + `env.notify`。架构设计差异，非 defect，无需统一。

## Closure

Status Note: 三个 Phase 全部 completed，所有 Exit Criteria 行为真的落地（closure audit 逐条核对 live code 确认，非仅接口存在）。验证全绿（5 核心测试文件 40 tests + typecheck clean + build 15 tasks + lint @nop-chaos/main + test 390 passed）。Deferred 分类诚实（dataType 跨项目无业务需求、client.ts abort bug 当前不传 signal 规避且 crud 取消正常）。唯一的 watch-only 项是后端 `%40selection` 运行时兼容性未实测（非代码缺陷，回退仅需一行）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent `ses_05c22baa4ffer5dAlklJcfUP0Q`
- Evidence: CONDITIONAL PASS。逐 Phase 逐条核对 live code：Phase 1（nopRpcResolver.ts:37/53/58 selection 入参+优先级+双重转义，adapter.ts:64 透传，14 tests 断言 %40selection）；Phase 2（httpBlob.ts:38-57 三分支，http.ts:236 blob 归一化集成，adapter.ts:65-66 透传，4 tests）；Phase 3（nopRpcResolver.ts:50 filterSpecialFields，http.ts:182 errors 字段，http.ts:206-226 HTTP非2xx envelope，http.ts:273/306 catch status -1，6 容错 tests）。Deferred 诚实。文档同步（backend-integration.md §9 + 07-27.md）。唯一 watch-only：后端 %40selection 兼容性待真实环境实测。

Follow-up:

- 后端 `%40selection` 参数名解码兼容性实测（watch-only residual）：需 nop-entropy 8080 真实环境验证。若后端不解码参数名，回退 `nopRpcResolver.ts:58` 去掉 `encodeURIComponent('@selection')`（保留值转义）。非代码缺陷，回退仅需一行。
