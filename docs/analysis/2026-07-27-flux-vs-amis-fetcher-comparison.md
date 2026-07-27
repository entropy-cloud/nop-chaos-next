# Flux `env.fetcher` vs AMIS `ajaxFetch` 实现对比分析

> 范围：`@query` / `@mutation` 处理、`@selection` 投影、容错（网络/HTTP/业务错误/AbortError）、blob 下载与 JSON-in-blob 恢复、返回值结构对齐。
> 日期：2026-07-27。状态：**v4（responseKey/dataPath 深度再调研，新增 §11 设计哲学对比）**。
> 关联：`docs/bugs/49-flux-dict-loading-selection.md`、`docs/bugs/50-flux-form-submit-data-empty.md`、`docs/design/backend-integration.md`。

---

## 0. TL;DR（核心结论）

| 维度 | AMIS（`ajaxFetch` 链路） | Flux（`nopRpcRequest` 链路） | 差距 |
| --- | --- | --- | --- |
| `@query/@mutation` 路由 | `POST /graphql`（GraphQL query+variables） | `POST /r/{OpName}`（REST RPC） | ✅ 符合设计（flux 不走 graphql） |
| `@mutation` body 包装 | `variables.data`（`argDataMap` 过滤 `__`/`@`/`v_`） | `{data: originalData}`（**不过滤特殊字段**） | ⚠️ flux 可能把 `__typename` 等噪声字段提交给后端 |
| **`@selection` 来源** | URL 路径 `/sel` **或** `gql:selection` 属性 | **仅** URL 路径 `/sel` | 🔴 **未读 `api.selection` 属性**（用户明确要求） |
| `@selection` 传递方式 | 嵌入 GraphQL query 字符串 | `?@selection=` URL query param | ✅（当从 URL 路径取时） |
| 容错：网络错误 | `normalizeNetworkError` + i18n 消息 | catch → `{ok:false,status:0,data:null}` | ⚠️ 无 i18n、无消息体 |
| 容错：AbortError | **重抛**（不吞） | **吞掉**（与 status:0 混淆） | ⚠️ 当前刻意不传 signal 规避，但隐患在 |
| 容错：HTTP 非 2xx | 状态码→消息映射表（401/403/500…） | `Request failed: {status}` 或 `body.msg` | ⚠️ 体验粗糙 |
| blob：responseType 透传 | `AmisRequestOptions.responseType` 全链路 | **adapter 丢弃 `api.responseType`** | 🔴 blob 下载完全不工作 |
| blob：attachment 下载 | `downloadBlob` + 合成成功 | **无** | 🔴 |
| blob：JSON-in-blob 恢复 | `text()` + `JSON.parse` | **无**（flux 导出了 `normalizeBlobResponse` 工具但未接入） | 🔴 |
| blob：filename 解析 | `parseContentDispositionFilename` | **无** | 🔴 |
| `downloadFileName` 覆盖 | N/A（amis 无此字段） | **adapter 丢弃 `api.downloadFileName`** | 🔴 |
| 返回值结构 | `AmisFetcherResult{status(HTTP),data,envelope,headers}` | `NopRpcResponse{ok,status(RPC),code,msg,data,headers,raw}` | ✅ 基本对齐 flux `ApiResponse`，但缺 `errors` |

---

## 1. 入口与数据流

### 1.1 AMIS 链路

```
amis-react env.fetcher(options)                     packages/amis-react/src/env.ts:25
  → fetchAmisRequest(options)                       packages/amis-core/src/core/ajax.ts:102
    → handleSpecialRequest (action:// / dict:// / page://)   ajax.ts:106
    → executeNetworkRequest(options)                ajax.ts:28
      → transformGraphQLRequest(options)            graphql.ts:82   ← @query/@mutation → /graphql
      → prepareRequest(...)                         ajaxRequest.ts:72
      → executeSharedRequest(...)                   ajaxRequest.ts:62  (adapter.request 或 httpClient)
      → normalizeGraphQLResponse(data, opName)      graphql.ts:149  ← {errors,extensions,data} → envelope
      → normalizeBlobResponse(response)             ajaxBlob.ts:69   ← responseType==='blob' 时
      → HTTP 非2xx & !isApiPayload → 合成 {status:-1,msg}   ajax.ts:76
      → responseKey 解包                            ajax.ts:86
    → notifyResult(options, result)                 ajax.ts:10  (toast)
```

### 1.2 Flux 链路

```
flux adapter env.fetcher(api, ctx)                  apps/main/src/flux/adapter.ts:58
  → nopRpcRequest({url,method,data,headers})        apps/main/src/services/http.ts:187
      ⚠️ 丢弃 api.selection / api.responseType / api.downloadFileName / ctx.signal
    → resolveNopRpcUrl(url, data)                   apps/main/src/services/nopRpcResolver.ts:20
        正则 ^@[a-zA-Z]+:([^/?]+)(?:/([^?]+))?
        @query  → POST /r/{OpName}, data 透传
        @mutation → POST /r/{OpName}, data = {data: originalData}
        URL 路径 /sel → ?@selection=encodeURIComponent(sel)
    → mainHttpClient.request({url,method,data,headers,signal})   http.ts:196
    → 手动解析 envelope {status,code,msg,data} → NopRpcResponse    http.ts:211
    catch → {ok:false, status, data:null, headers:{}, raw:error}  http.ts:227
```

---

## 2. `@query` / `@mutation` 处理对比

### 2.1 路由

- **AMIS**：`transformGraphQLRequest`（graphql.ts:82）识别 `query|mutation|subscription|graphql` 前缀，统一改写为 `POST /graphql`，body 为标准 GraphQL `{query, variables}`。
- **Flux**：`resolveNopRpcUrl`（nopRpcResolver.ts:20）识别 `@` 前缀（任意字母），改写为 `POST /r/{OperationName}`，data 原样作为 body。**符合"flux 不走 graphql"的设计要求**。

### 2.2 operation 名解析

- AMIS：`getOperationName`（graphqlArgs.ts:287）按**最后一个 `_`** 拆分（`NopAuthDept__save_1` → `save_1`？实际 `lastIndexOf('_')`，对 `NopAuthDept__save` 返回 `save`，用于查 `operationRegistry` 决定参数构造器）。
- Flux：正则 `([^/?]+)` 取整个 `NopAuthDept__save` 作为 opName，**直接拼到 URL**，不查参数注册表。

> 影响：AMIS 会按 operation（`findPage`/`save`/`get`...）用 `operationRegistry`（graphqlArgs.ts:239）构造 `query`/`data`/`query:QueryBeanInput` 等参数；Flux 完全透传 `api.data`，不做 query bean 组装（`limit`/`offset`/`orderBy`/`filter` 合并）。这意味着 **flux schema 侧必须自行把分页/排序/过滤组装好放进 `data`**，host 不做归一化。需确认这是否是预期。

### 2.3 `@mutation` body 包装

- AMIS：`operationRegistry.save.arguments = [{name:'data', builder: argDataMap}]`（graphqlArgs.ts:258）。`argDataMap`（graphqlArgs.ts:127）遍历 data，**过滤 `__`/`@`/`v_` 前缀字段**后作为 `variables.data`。
- Flux：`resolveNopRpcUrl`（nopRpcResolver.ts:35）当 `prefix==='@mutation' && data != null` 时 `data = { data }`，**不过滤任何字段**。

> ⚠️ **差距**：flux 模式下 `__typename`、`@`前缀、`v_`前缀字段会被原样包进 `{data}` 提交。若后端严格校验，可能报 `unknown-operation-arg`（与 bug #49 同类）。

---

## 3. `@selection` 处理对比（**核心**）

### 3.1 AMIS 的 selection 来源（graphql.ts:103-111）

```ts
const selectionStartIndex = path.indexOf('/');
const action = selectionStartIndex >= 0 ? path.slice(0, selectionStartIndex) : path;
const selection =
  selectionStartIndex >= 0
    ? decodeURIComponent(path.slice(selectionStartIndex + 1))  // ① URL 路径 /sel
    : pickerLoadOptions.selection;                              // ② normalizePickerLoadOptions → gql:selection
```

即 AMIS selection 有三个来源（优先级）：
1. **URL 路径**：`@query:Action/field1,field2` → selection = `field1,field2`
2. **`gql:selection` 属性**（`getGraphQLSelection` graphqlArgs.ts:26-28 读 `options['gql:selection']`）
3. **picker loadOptions 自动生成**（`items{id,name}` 等）

selection 最终嵌入 GraphQL query 字符串：`query Action(...){ Action(...) { {selection} } }`。

### 3.2 Flux 的 selection 来源（nopRpcResolver.ts:39-42）

```ts
const nopMatch = rawUrl.match(/^@[a-zA-Z]+:([^/?]+)(?:\/([^?]+))?/);
const selectionPath = nopMatch[2];
if (selectionPath) {
  url += '?@selection=' + encodeURIComponent(selectionPath);
}
```

即 **只支持来源 ①（URL 路径）**，且以 `?@selection=` URL query param 传递（符合 bug #49 记录的后端约定：REST RPC 用 `?@selection=`，body 里的 `gql:selection` 会被拒）。

### 3.3 问题：flux 的 `selection` 是独立属性，不在 URL 里

flux 的 `ExecutableApiRequest`（flux-core `schema-base-types.ts:46-60`）明确把 `selection` 作为**独立字段**：

```ts
export interface ExecutableApiRequest extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  headers?: Record<string, string>;
  selection?: string;                          // ← 独立字段（源码无注释，与 responseType/downloadFileName 同级保留）
  // 以下三项 flux runtime 在 finalization 时刻意剥离（never），不会传给 fetcher：
  params?: never;
  includeScope?: never;
  responseAdaptor?: never;
  requestAdaptor?: never;
  // 以下两项源码注释为 "Propagated from ApiSchema so the host fetcher can read"：
  responseType?: 'json' | 'blob' | 'text';     // schema-base-types.ts:56-57
  downloadFileName?: string;                    // schema-base-types.ts:58-59
}
```

> 关键观察：`params`/`includeScope`/`responseAdaptor`/`requestAdaptor` 被标为 `never`，说明 flux runtime **刻意在 finalization 时剥离**这些字段后才交给 fetcher；而 `selection`/`responseType`/`downloadFileName` 被刻意保留——这三项正是 host fetcher 必须消费的字段。

flux runtime 的 `finalizeApiRequest` / `materializeApiRequest`（request-runtime.ts:314,339）把 `selection` 原样放进 `request.selection`，**不会把它并入 URL**（`finalUrl = canonicalizeUrlWithParams(api.url, params)`，params 仅来自 `api.params`，不含 selection）。专项测试 `request-runtime-normalization.test.ts:166` 验证 `prepared.request.selection === 'id,name,role{id,label}'` 且 URL 保持 `/api/users/1` 不变。

flux schema 写法（flux-guide `03-api-config.md:145`）：

```json
{ "url": "/api/users", "method": "get", "selection": "id,name,email" }
```

即 selection 与 url 平级。**当这种请求到达 host fetcher 时，`api.url === '/api/users'`（无 `/selection` 后缀），`api.selection === 'id,name,email'`。**

### 3.4 当前实现的缺陷

当前 `resolveNopRpcUrl` **完全不读 `api.selection` 属性**。结果：

- flux schema 用 `{url: '@query:X', selection: 'a,b'}` 声明投影 → selection 被静默丢弃，后端返回全字段。
- 只有写成 amis 风格 `@query:X/a,b`（selection 塞进 URL 路径）才会生效 —— 但这违背 flux schema 约定。

> 🔴 **与用户要求直接冲突**：用户明确"支持 `@selection` 参数，通过 **selection 属性**读取，而不是 `gql:selection` 属性"。当前实现既不读 `selection` 属性，也不读 `gql:selection`，只认 URL 路径。

### 3.5 还需澄清的点

1. flux 的 `@query:` URL 是否会出现 `/selection` 路径形式？flux schema 约定 selection 是独立字段，**不应**混进 URL。当前 `resolveNopRpcUrl` 对 URL 路径的处理更像是"兼容 amis 风格输入"的兜底，而非 flux 主路径。
2. 后端 REST RPC 对 `?@selection=` 的编码要求：当前用 `encodeURIComponent`，对 `items{id,name}` 这类含 `{}` 的 selection 会编码为 `items%7Bid%2Cname%7D`。需确认后端是否正确解码（bug #49 日志显示曾用 `?@selection=options{value,label}`，但未明确是否编码）。

---

## 4. 容错处理对比

### 4.1 网络层错误（fetch 抛异常）

| 场景 | AMIS（`normalizeNetworkError` ajaxMessages.ts:65） | Flux（http.ts:227 catch） |
| --- | --- | --- |
| `AbortError` | **重抛**（ajaxMessages.ts:68）—— 让上层 cancel 语义生效 | 吞掉，返回 `{ok:false, status:0, data:null, raw:error}` |
| `Failed to fetch` | 替换为 i18n `networkExceptionMsg` | `String(err)` 或 `error.message` 塞进 raw，不进 msg |
| 其他 Error | i18n `apiRequestFailed` | 同上 |
| 非 Error | i18n `apiRequestFailed` | `new Error(String(err))` |

> ⚠️ Flux 当前在 adapter.ts:54-57 有长注释解释"刻意不传 ctx.signal"，因为 `mainHttpClient`（`client.ts`）的 abort 处理有 bug：`client.ts:188-190` 对 `error.name === 'AbortError'` 检查 `error.cause instanceof Error`，但浏览器 fetch 抛出的 `AbortError`（DOMException）的 `.cause` **不携带** `signal.reason`（fetch 规范不把 signal.reason 链到抛出错误的 `.cause`），因此 `error.cause instanceof Error` 几乎总为 false → **所有** abort 都被误判为 timeout 并抛 `createTimeoutError`（不仅是"无 reason"的）。daily log `07-27.md` 记录实证："mock fetcher（不监听 signal）正常；nopRpcRequest（传 signal）不渲染"。这是一个**已知的规避性 hack**：用"不取消"绕过 client 的 abort 处理 bug。若未来修复 client.ts（应检查 `signal.reason` 或 abort 来源而非 `error.cause`），flux fetcher 应当传 signal，届时 AbortError 必须能重抛/被 flux runtime 识别（flux runtime 的 `executeRequestWithControl` 依赖 abort 语义做 cancel-previous 去重）。

### 4.2 HTTP 非 2xx

| 维度 | AMIS（ajax.ts:76-81） | Flux（http.ts:203-210） |
| --- | --- | --- |
| body 是 ApiPayload | 透传 envelope（业务错误由 `data.status` 体现） | HTTP 非2xx **直接抛错**，不进入 envelope 解析 |
| body 非 ApiPayload | 合成 `{status:-1, msg: normalizeErrMessage(status)}` | `Request failed: {status}` 或 `body.msg` |
| 状态码→消息 | i18n 映射表（401/403/404/500/502…，ajaxMessages.ts:35） | 无映射 |

> ⚠️ Flux 的 http.ts:203 对 HTTP 非2xx **先抛错**，导致后端返回的标准 envelope（HTTP 200 + `{status:-1,msg}`）能正常解析，但 HTTP 4xx/5xx + envelope 的情况会丢失业务 msg（被 catch 吞成 raw）。Nop RPC 约定是 HTTP 200 + envelope（见 AGENTS.md 跨项目调试规则"Nop RPC 错误处理总是 HTTP 200"），所以实际影响有限，但容错不如 amis。

### 4.3 业务 envelope（`status !== 0`）

- AMIS：`isApiPayload(data)` 检测（payload.ts:7），`ajaxFetch` 的 `unwrapApiPayload`（payload.ts:19）在 `status!==0` 时**抛 Error**。
- Flux：`nopRpcRequest` 解析 `body.status`，设 `ok: status===0`，**不抛错**（返回 `{ok:false,...}`）。

> ✅ Flux 不抛错是对的 —— flux runtime 的 `executeApiSchema`（request-runtime.ts:435）自己根据 `ok`/`status` 判定并 `createApiResponseError` 抛结构化错误。**host fetcher 不应替 runtime 抛业务错误**。

### 4.4 其他容错差距

- **responseKey 解包**：AMIS 支持（ajax.ts:86，`data: {[responseKey]: data.data}`），Flux 不支持。flux schema 是否有等价机制？需查 flux-guide。
- **errors 字段**：flux `ApiResponse.errors`（字段级校验）—— 当前 `NopRpcResponse` 没解析 `body.errors`，丢失字段级错误。flux runtime `createApiResponseError`（request-runtime.ts:80）会把 `response.errors` 挂到抛出的错误上。

---

## 5. Blob 处理对比（**核心缺口**）

### 5.1 responseType 透传

> 关键前提：flux runtime 已经把 `selection`/`responseType`/`downloadFileName` 原样送到 `env.fetcher` 门口（`request-runtime.ts:417-422` 把 `ExecutableApiRequest` 透传，`flux-bundle/src/types.ts:26` `FluxApiRequest = ExecutableApiRequest`）。host adapter 只需"把这些字段接下来"即可，无需自行从 schema 解析。

- AMIS：`AmisRequestOptions.responseType`（types.ts:17）→ `prepareRequest`（ajaxRequest.ts:72）→ `executeSharedRequest`（responseType 传给 httpClient）→ httpClient 按 responseType 解析响应。
- Flux：`adapter.ts:58-64` 的 fetcher 调用 `nopRpcRequest({url,method,data,headers})`，**完全没传 `api.responseType` / `api.downloadFileName`**。`NopRpcRequestOptions`（http.ts:163）也没有 `responseType` 字段。

> 🔴 后果：flux schema 声明 `{responseType: 'blob'}` 的下载请求，host 仍按 JSON 解析，blob 下载完全不工作。

### 5.2 blob 归一化（`normalizeBlobResponse`）

AMIS（ajaxBlob.ts:69）三分支处理：

| 条件 | 行为 |
| --- | --- |
| `content-disposition: attachment` | `downloadBlob` + 合成 `{status:0, msg:downloading}` |
| `content-type: application/json` | `text()` + `JSON.parse`（JSON-in-blob 错误恢复） |
| 其他 | 原样返回 Blob |

flux-runtime **导出了等价的 `normalizeBlobResponse`**（`flux-runtime/src/async-data/blob-download.ts:67`），但**行为语义与 amis 不等价，签名也不同**：

| 维度 | AMIS（ajaxBlob.ts:69） | Flux（blob-download.ts:67） |
| --- | --- | --- |
| 入参签名 | `(response: AmisFetcherResult)` —— 接收完整响应 | `(blob: Blob, api, responseHeaders?)` —— 接收裸 Blob + api 元信息 |
| 返回类型 | `AmisFetcherResult` | `ApiResponse` |
| 下载触发 | **仅** `content-disposition: attachment` 时下载（ajaxBlob.ts:77）；无 attachment 时返回原始 Blob | **优先** 检查 content-type JSON（blob-download.ts:75）；非 JSON 时**只要有 filename 就下载**（含 `api.downloadFileName` 覆盖），更激进 |
| JSON-in-blob 恢复 | 仅 `data` 透传 | 保留 `code`/`errors`（blob-download.ts:80-87）—— 更完整 |
| filename 解析 | `parseContentDispositionFilename`（粗糙正则） | `extractFilenameFromContentDisposition`（优先 RFC 5987，blob-download.ts:10）—— 更健壮 |
| revoke 延迟 | 100ms（ajaxBlob.ts:66） | 40s（blob-download.ts:4）—— 更稳 |

> ⚠️ 结论修正：flux 版在 **filename 解析 + JSON-in-blob 恢复** 上更完善，但**下载触发逻辑不同**（amis 仅 attachment，flux 非 JSON 即下载），集成不是 drop-in 替换，**需要适配层**。且集成存在阻断问题（见 §8.2 / E1）。

但 **main 的 adapter 完全没有调用它**。

### 5.3 filename 解析

- AMIS：`parseContentDispositionFilename`（ajaxBlob.ts:8）—— 正则较粗糙，`filename[^;=\n]*=...`。
- Flux 导出：`extractFilenameFromContentDisposition`（blob-download.ts:10）—— 优先 RFC 5987，更健壮。
- 当前 main：无。

> 结论：flux 已提供更优的 blob 工具，host 只需接入。

---

## 6. 返回值结构对齐

### 6.1 flux `ApiResponse`（renderer-api.ts:15）

```ts
interface ApiResponse<T> {
  ok?: boolean;        // computed: status===0，fetcher 可不设
  status: number;      // 0=成功，非0=失败（RPC 状态码，非 HTTP）
  data: T;
  code?: string;
  msg?: string;
  errors?: Record<string,string>;  // 字段级校验
  headers?: Record<string,string>;
  raw?: unknown;
}
```

### 6.2 当前 `NopRpcResponse`（http.ts:171）

```ts
interface NopRpcResponse<T> {
  ok: boolean; status: number; code?: string; msg?: string;
  data: T | null; headers: Record<string,string>; raw: unknown;
}
```

> ⚠️ 差距：
> - `data: T | null` vs `data: T` —— 当后端 envelope `data` 缺失时返回 null，flux runtime 会把 null 当合法数据传给 responseAdaptor。需确认是否应透传 `undefined`。
> - 缺 `errors` —— 字段级校验错误丢失。
> - `headers: {}` 在 catch 路径是空对象，正常路径是 `response.headers`（类型一致，OK）。

### 6.3 flux runtime 如何消费返回值

`executeApiSchema`（request-runtime.ts:433）：

```ts
const isOk = response.status === 0 || response.ok === true;
if (!isOk) { /* applyResponseAdaptor(fallback) → createApiResponseError 抛错 */ }
```

即 runtime 只看 `status===0` 或 `ok===true`。当前 `NopRpcResponse.ok` 设置正确（`rpcStatus === 0`），**返回值层面 flux 能正常判定**。

> ⚠️ 但 HTTP 非2xx 路径存在 status 类型混淆（见 §7 P3-12）：`http.ts:207-209` 抛出的 `error.status = response.status`（HTTP status，如 500）→ `http.ts:229` catch 取作 `NopRpcResponse.status`。flux runtime 按 `status===0` 判定不受影响（500 ≠ 0 判失败），但返回的 status 语义是 HTTP 而非 RPC，上层若读 `status` 做分支可能误判。

---

## 7. 问题清单（按严重程度）

### 🔴 P0（功能性缺失，与用户要求直接冲突）

1. **`api.selection` 属性未读取**（nopRpcResolver.ts:20）。flux schema 用独立 `selection` 字段声明投影，当前被静默丢弃。
   - 修复方向：`resolveNopRpcUrl` 增加从 `api.selection`（或传入的 `selection` 参数）读取；selection 应作为 `?@selection=` 追加到 `/r/` URL。优先级：URL 路径 > `api.selection` 属性（兼容两种写法），或按 flux 约定**只认 `api.selection` 属性**。
2. **blob 下载完全不工作**。`adapter.ts:58` 丢弃 `api.responseType`，`nopRpcRequest`/`NopRpcRequestOptions` 无 responseType 字段，未接入 flux 的 `normalizeBlobResponse`。
   - 修复方向：透传 `responseType`/`downloadFileName`；按 responseType 调用 blob 归一化。**阻断**：`@nop-chaos/flux`（flux-bundle）当前不导出 `normalizeBlobResponse`，仅 `@nop-chaos/flux-runtime` 导出（见 §8.2 / E1）。

### ⚠️ P1（容错/数据质量）

3. **`@mutation` 未过滤特殊字段**（nopRpcResolver.ts:35）。`__typename`/`@`前缀/`v_`前缀字段会被包进 `{data}` 提交，可能触发后端 `unknown-operation-arg`。
   - 修复方向：复用 amis `argDataMap` 的过滤逻辑（graphqlArgs.ts:127），或 flux 侧约定 schema 不混入这些字段。
4. **`errors` 字段丢失**（http.ts:211 envelope 解析）。字段级校验错误不传给 flux runtime。
   - 修复方向：`NopRpcResponse` 增加 `errors`，从 `body.errors` 解析。
5. **AbortError 被吞**（http.ts:227）。当前靠"不传 signal"规避，隐患存在。
   - 修复方向：catch 中识别 `AbortError`/`name==='AbortError'` 重抛；或修复 client.ts 的 abort reason 处理后正常传 signal。
6. **HTTP 非2xx + envelope 丢失业务 msg**（http.ts:203 先抛错）。
   - 修复方向：HTTP 非2xx 时若 body 是 ApiPayload，走 envelope 解析路径而非直接抛。

### ℹ️ P2（体验/对齐）

7. 网络错误无 i18n 消息（flux 端是否需要？flux runtime 自己有 `createApiResponseError` 兜底消息）。
8. ~~`responseKey` 解包 flux 端无等价~~ —— **深入调研后确认：flux 不需要新增 responseKey**。amis responseKey（ajax.ts:86-93）仅是"成功时把 `{status,msg,data:X}` 重写为 `{[key]:X}`"的语法糖；flux 的 `responseAdaptor`（运行时表达式，接收 `payload`+`api`，`return` 最终数据，flux-guide `03-api-config.md:44-61`）是它的**严格超集**——`responseKey='items'` 等价于 `responseAdaptor: "return { items: payload.data }"`，且能做嵌套提取/多字段重组/条件分支。flux 架构把响应变换放在 runtime 层（fetcher 之后），比 amis 把 responseKey 塞进 fetcher 链路更干净。主项目业务 schema 零使用 responseKey。**结论：无需在 nop-chaos-flux 增加 responseKey**。
9. filename 解析正则不如 flux 导出版健壮（若接入 flux `normalizeBlobResponse` 自动解决）。
10. ~~`selection` 编码：`encodeURIComponent` 对 `items{id,name}` 会编码 `{}`~~ —— **已确认后端能正确解码**（bug #49 验证 `?@selection=options{value,label}` 通过；标准 servlet/Quarkus 自动 URL-decode）。非缺口。

### ℹ️ P3（核查新发现的隐蔽缺口/差异）

11. **`dataType` 请求体编码全链路缺失**（schema-base-types.ts:43）。`ApiSchema.dataType?: 'json'|'form-data'|'form'` 在 finalization 时被丢弃（不在 `ExecutableApiRequest`），flux-runtime 无 FormData/urlencode 处理（grep 零命中），host `NopRpcRequestOptions` 无该字段。**form-data/form 编码当前完全不支持**，比 selection 缺口更隐蔽。建议列 P1。
12. **HTTP 非2xx 时 status 类型混淆**（http.ts:207-209,229）。抛出的 `error.status = response.status`（HTTP status，如 500）→ catch 取作 `NopRpcResponse.status`。flux runtime 按 `status===0` 判定虽不受影响，但返回的 status 语义是 HTTP 而非 RPC，可能误导上层。
13. **通知层架构差异**：amis 在 fetcher 层 `notifyResult`（ajax.ts:10-26）按 `data.msg` 自动弹 toast（受 `silent`/`useAlert` 控制）；flux fetcher **不弹 toast**，通知由 ajax action 的 `messages` config + `env.notify` 处理。`silent`/`useAlert` 无 flux 等价。迁移时需注意。
14. **`handleSpecialRequest` 协议路由差异**：amis 在 fetcher 层拦截 `action://`/`dict://`/`page://`（ajaxSpecial.ts）；flux 无等价——dict/page 走独立 `env.loadDict`/`env.loadPage`，action 走 action 体系。
15. **请求方法默认值差异**：amis `ajaxRequest.ts:75` `method ?? (data===undefined ? 'GET' : 'POST')`；flux `nopRpcResolver.ts:46` 对 `@`前缀固定 POST，非前缀 `http.ts:236` `?? 'GET'`；flux-guide `11-host-integration.md` 示例用小写 `'get'`。大小写/默认值需统一。

---

## 8. 建议方案（待核查后定稿）

### 8.1 selection 读取（P0-1）

核查结论：flux schema 的 `selection` **仅**作为独立属性（`schema-base-types.ts:35,51`，flux-guide `03-api-config.md` 所有示例），flux runtime **不**把它并入 URL（仅 `request-runtime.ts:322,346` 赋值到 `request.selection`）。因此 host fetcher 是 selection 的唯一消费者，应**以独立 `selection` 参数为主**——`@query:`/`@mutation:` 的 URL 里不一定有 selection（用户已明确）。

推荐方案：

```ts
// resolveNopRpcUrl 增加 selection 入参。优先级：
//   ① 独立 selection 参数（flux 主路径，api.selection 透传而来）
//   ② URL 路径 '/sel'（兼容 bug #49 修复时 '@query:X/sel' 的 amis 风格兜底）
const apiSelection = selection || undefined;          // 空串归一为 undefined
const finalSelection = apiSelection ?? selectionPath;
if (finalSelection) {
  // ⚠️ 参数名和参数值都要转义（用户要求）。
  //   encodeURIComponent('@selection') === '%40selection'
  url += '?' + encodeURIComponent('@selection') + '=' + encodeURIComponent(finalSelection);
}
```

需把 `selection` 作为 `NopRpcRequestOptions` 的入参字段，并在 `adapter.ts` 透传 `api.selection`。selection **必须**通过 URL 的 `@selection` query param 传递给后端（用户要求；REST RPC body 里的 `gql:selection` 会被后端拒，见 bug #49）。

> ⚠️ **后端解码风险（需验证）**：当前代码（`nopRpcResolver.ts:41`）只转义值、参数名 `@selection` 以字面 `@` 发送——bug #49 日志确认后端**接受字面 `@selection`**。改为"参数名也转义"后发送 `%40selection`，需后端框架对 query param **名**做 URL-decode（Spring/Jersey 默认 decode 参数名，但 servlet API/Undertow 原生层不一定）。若后端实测不识别 `%40selection`，需回退为字面 `@selection`（仅转义值）。建议落地时用真实后端验证一次。

> 实现细节：`api.selection` 可能是空字符串，`??` 不会拦截空串，需先 `|| undefined` 归一。属性与 URL 路径同时存在且冲突时按"独立参数优先"，建议日志 warn 以便排查。

### 8.2 blob 接入（P0-2）

- `NopRpcRequestOptions` 增加 `responseType`/`downloadFileName`。
- `adapter.ts` 透传 `api.responseType`/`api.downloadFileName`。
- `nopRpcRequest` 在 `responseType==='blob'` 且响应是 Blob 时，调用 blob 归一化。

> 🔴 **阻断问题（E1）**：`@nop-chaos/flux`（即 flux-bundle，host 实际依赖的包）**不导出** `normalizeBlobResponse`——核查确认 `flux-bundle/src/index.tsx` 仅导出类型 + renderer 工厂，未 re-export blob 工具。仅 `@nop-chaos/flux-runtime`（`flux-runtime/src/index.ts:35`）导出，且 flux-guide 未文档化该 API。host（`apps/main`）不直接依赖 flux-runtime。
>
> 修复方向三选一（需跨项目协调）：
> 1. 在 flux-bundle `src/index.tsx` 增加 `export { normalizeBlobResponse } from '@nop-chaos/flux-runtime'`，host 从 `@nop-chaos/flux` 导入；
> 2. host 添加 `@nop-chaos/flux-runtime` 直接依赖；
> 3. host 自行实现等价逻辑（参考 `blob-download.ts`，注意签名是 `(blob, api, headers)` → `ApiResponse`，与 amis 版不同，需适配层）。
>
> 注意 flux 版与 amis 版下载触发逻辑不同（见 §5.2），不能直接照搬 amis 的 `ajaxBlob.ts`。

### 8.3 特殊字段过滤（P1-3）

在 `@mutation` 包装前，复用 `argDataMap` 过滤逻辑（从 amis-core 导出，或 flux 侧自行实现）。

### 8.4 errors / AbortError / HTTP envelope（P1-4/5/6）

见问题清单，逐一补齐。

---

## 9. 开放问题核查结论（v2 已全部确认）

| # | 问题 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | flux schema 的 `@query:` URL 是否会出现 `/selection` 路径形式？ | **否**。selection 仅作为独立属性 | `flux-guide/03-api-config.md`；`schema-base-types.ts:35,51` |
| 2 | flux runtime 是否在某处把 selection 并入 URL/data？ | **否**。host fetcher 是唯一消费者 | 全量 grep 仅 `request-runtime.ts:322,346` 赋值 |
| 3 | query bean 组装（limit/offset/filter/orderBy）由谁负责？ | **schema 侧自行组装**，host 不归一化；flux 无 amis `argQuery` 等价 | grep `orderBy\|QueryBean` flux-runtime/core 零业务命中 |
| 4 | flux 是否有 `responseKey` 等价？ | **有更优等价（`responseAdaptor`），无需新增**。amis responseKey 仅是"成功时重挂 data 到某 key"的语法糖；flux `responseAdaptor`（运行时表达式）是其严格超集。主项目业务零使用 responseKey | `flux-guide/03-api-config.md:44-61`；amis `ajax.ts:86-93`；主项目 grep responseKey 零业务命中 |
| 5 | `?@selection=` 是否需要编码？后端能否解码？ | **需** `encodeURIComponent`，后端能解码 | bug #49 验证 `?@selection=options{value,label}` 通过 |
| 6 | flux `normalizeBlobResponse` 是否稳定公开 API？ | **从 `@nop-chaos/flux-runtime` 导出，但 `@nop-chaos/flux`(flux-bundle) 不 re-export，flux-guide 未文档化** | `flux-runtime/src/index.ts:35` ✅ vs `flux-bundle/src/index.tsx` ❌ |
| 7 | client.ts abort bug 是否属实？ | **属实**，且影响**所有** abort（fetch 抛出的 DOMException.cause 不链接 signal.reason） | `client.ts:188-190`；daily log `07-27.md` 实证 |

---

## 11. 响应数据 → scope：responseKey / dataPath / then+setValue 的设计哲学对比

> 本节回应"responseKey 是否把 ApiResponse.data 设置到 scope？flux 的 dataPath 是否类似？是否该给所有 action 增加统一 dataPath？"的深入调研。**结论修正了 §7-P2-8 / §9-#4 的浅层判断**：responseKey 不仅是"responseAdaptor 的语法糖"，它背后是 amis 与 flux 两种根本不同的"响应数据如何进入 scope"哲学。

### 11.1 amis responseKey 的真正功能

responseKey 本身**不写 scope**。它分两层：

1. **fetcher 层**（`ajax.ts:86-93`）：响应成功（status 0/200）时，把 `data: {status,msg,data:X}` 重写为 `data: {[responseKey]:X}`。仅此而已——重命名 data 的结构。
2. **action 层**（百度 amis 原版，**不在本项目的 amis-core 内**——本项目 `amis-core/src/page/action.ts` 只做 action 字符串绑定 `@action:`→`action://`，不含执行/scope 写入）：amis 的 ajax action 把 fetcher 返回的 `data` **隐式整体 merge 到组件的 data scope**。

所以 responseKey 的完整效果：因为 amis 会隐式 merge，responseKey 控制 merge 时的**字段命名**——无 responseKey 时 scope 得到解包的 `data`，有 `responseKey:'items'` 时 scope 得到 `{items: X}`。

> 用户问"是把 ApiResponse 的 data 设置到 scope 上下文中吗？"——**间接是的**，但 responseKey 只负责"命名"，真正"写 scope"是 amis action 的隐式 merge 行为。responseKey 是为隐式 merge 打的补丁。

### 11.2 flux 的对应机制：曾有 action 级 dataPath，已移除

flux **曾有** action 级 `dataPath`，语义就是"ajax 结果写 `scope[dataPath]`"——这与 amis responseKey + 隐式 merge **确实是同类机制**。证据：

- `docs/logs/2026/05-01.md:175`："removed `dataPath` from `ActionShapeFields` and `CompiledActionTargeting`"
- `docs/logs/2026/05-01.md:176`："`flux-runtime/src/runtime-action-helpers.ts`: removed `dataPath` response-path write logic"
- `docs/logs/2026/05-03.md`："action 写入目标统一通过 `args.path`，不再把 action `dataPath` 当正式字段"
- `docs/architecture/action-algebra-formal-spec.md:188`："the older `dataPath` name would blur write-path semantics with other legacy publication terminology, so `path` stays the canonical write DTO field"

**移除原因**（flux 项目自己的裁定）：
1. **职责分离**：ajax 是请求传输，写 scope 是独立的副作用，不应耦合。
2. **显式优于隐式**：`setValue(args.path)` 让数据流可见、可追踪；隐式 merge 会产生"数据从哪来"的困惑。
3. **术语统一**：消除 `dataPath` vs `path` 的冲突（一个概念多个字段是 flux 反模式，见 `docs/skills/code-refactor-discovery-prompt.md:81`）。

### 11.3 flux 当前的"响应数据 → scope"路径（无需 dataPath）

flux 的 ajax action **不写 scope**，通过显式组合实现：

```
ajax action (performAjaxRequest, runtime-action-helpers.ts:171-282)
  → executeApiSchema 返回 {data, ok, status, ...}
  → 包成 ActionResult { ok, data }        ← 不写 scope！
  → then 链通过 evaluationBindings 注入 ${result} / ${prevResult}
       (action-execution.ts:552-568, createBranchEvaluationBindings)
  → 要写 scope，显式接 setValue：
       { action:'ajax', args:{...}, then:{
           action:'setValue', args:{ path:'users', value:'${result}' } } }
```

证据：
- `performAjaxRequest` 返回 `{ok:true, data: response.data, ...}`（runtime-action-helpers.ts:244-250），无任何 scope 写入。
- then 链 `evaluationBindings` 注入 `result`/`prevResult`（action-execution.ts:554 `createBranchEvaluationBindings(result, currentActionCtx.prevResult)`；测试 `runtime-actions-chained.test.ts:192` 用 `'${result.ok}:${prevResult.ok}'`）。
- `ActionShapeFields`（`actions.ts:134-158`）**无 dataPath**，写 scope 统一走 `SetValueActionArgs.path`（`actions.ts:104-107`）。

### 11.4 flux 中其他 `dataPath`（不同概念，勿混淆）

| dataPath 出现处 | 含义 | 状态 |
| --- | --- | --- |
| ~~`ActionShapeFields.dataPath`~~ | ajax 结果写 scope 路径 | **已移除**（2026-05） |
| `DataSourceSchema.dataPath` | 数据源发布到 scope 的绑定路径 | legacy 兼容，主路径已转为 `name`（logs 2026-04-17） |
| `flux-code-editor` source-ref `dataPath` | 代码编辑器数据提取路径 | legacy，推荐用 `path`（logs 2026-05-05） |

### 11.5 回答："是否该给所有 action 增加统一 dataPath 用于更新 scope？"

**不应该。** 三个层面理由：

1. **flux 已刻意移除并裁定**：flux 在 2026-05 经过正式 plan（Plan 191）移除了 action 级 `dataPath`，理由是职责分离 + 显式数据流 + 术语统一。重新加回是开倒车。
2. **flux 已有更优等价组合**：`then` 链 + `${result}` + `setValue(args.path)` 比 amis 的 `responseKey` + 隐式 merge 更清晰——数据流显式可追踪，每个写 scope 的动作都是独立的、可审计的 action 节点。
3. **amis responseKey 本身是隐式 merge 哲学的补丁**：因为 amis ajax 会隐式 merge 整个 data 到 scope，才需要 responseKey 控制命名。flux 根本不做隐式 merge，所以连"补丁"都不需要。

> 结论：**responseKey / dataPath 不需要在 flux 增加**。flux 的 `then` + `result` + `setValue` 三段式是更优的"响应数据 → scope"机制。若某些场景觉得显式 setValue 啰嗦，正确的优化方向是**简化 then+setValue 的语法糖**（例如支持 `then.setValue` 快捷写法），而不是 reintroduce 隐式的 action 级 dataPath。

### 11.6 对 §7-P2-8 / §9-#4 的修正

之前结论"flux responseAdaptor 是 responseKey 的超集，无需新增"——**结论正确但理由浅**。准确理由应是：responseKey 服务于 amis 的"ajax 隐式 merge 到 scope"哲学；flux 采用"ajax 只传输 + 显式 setValue 写 scope"哲学，已移除等价的 action `dataPath`（Plan 191），`then`+`result`+`setValue` 是更优替代。`responseAdaptor` 只是响应**变换**（不写 scope），与 responseKey 解决的"scope 命名"是不同层面。

---

## 12. 修订历史

- **v1**（初稿）：完成双链路对比与问题清单。
- **v2**（核查后修订）：
  - 🔴 修正阻断性方案错误（E1）：`@nop-chaos/flux` 不导出 `normalizeBlobResponse`，blob 接入需跨项目协调（§8.2）。
  - ⚠️ 修正 §3.3 杜撰的源码注释，补全 `ExecutableApiRequest` 的 `never` 字段，说明 flux runtime 刻意剥离 params/adaptor。
  - ⚠️ 修正 §4.1 abort bug 描述（影响所有 abort，非仅"无 reason"）。
  - ⚠️ 修正 §5.2 blob 行为差异（flux 与 amis 下载触发逻辑不等价，签名不同，需适配层）。
  - 新增 P3 问题清单（§7）：`dataType` 请求体编码全链路缺失（P3-11）、HTTP 非2xx status 类型混淆（P3-12）、通知层架构差异（P3-13）、协议路由差异（P3-14）、方法默认值差异（P3-15）。
  - §8.1 selection 方案定稿（属性优先 + URL 路径兜底）。
  - §9 开放问题全部给出最终结论。
- **v2.1**（小幅补充）：selection 空串归一提示、flux runtime 已送达 fetcher 的显式说明。
- **v3**（用户反馈后定稿）：
  - §8.1 selection 方案修正：独立 `selection` 参数为主（URL 路径仅兼容兜底，因为 `@query:`/`@mutation:` URL 里不一定有 selection），参数名和值**都要** `encodeURIComponent`（修正当前 `nopRpcResolver.ts:41` 只转义值的 bug），并标注后端对 query param **名**解码的风险（bug #49 验证的是字面 `@selection`，改为 `%40selection` 需后端实测）。
  - responseKey 深入调研结论（§7-P2-8 / §9-#4）：flux 的 `responseAdaptor`（运行时表达式）是 amis responseKey（语法糖）的严格超集，**无需在 nop-chaos-flux 增加 responseKey**。
- **v4**（responseKey 深度再调研）：新增 §11 章节，纠正 v3 对 responseKey 的浅层理解。responseKey 不是简单的"responseAdaptor 语法糖"——它服务于 amis 的"ajax 隐式 merge 到 scope"哲学；flux 采用相反的"ajax 只传输 + 显式 setValue 写 scope"哲学，**曾有的 action 级 `dataPath` 已在 Plan 191（2026-05）移除**。明确回答"不应给所有 action 增加统一 dataPath"，flux 的 `then`+`${result}`+`setValue(args.path)` 三段式是更优替代。
