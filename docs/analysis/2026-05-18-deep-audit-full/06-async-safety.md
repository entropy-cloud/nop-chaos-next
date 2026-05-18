# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

已完成首轮初审。先读了以下文档：

- `C:\can\nop\nop-chaos-next\docs\index.md`
- `C:\can\nop\nop-chaos-next\AGENTS.md`
- `C:\can\nop\nop-chaos-next\docs\design\plugin-system.md`
- `C:\can\nop\nop-chaos-next\docs\design\extension-system.md`

补充说明：
- 已检查 React Query 全局配置：`C:\can\nop\nop-chaos-next\apps\main\src\main.tsx`
- 已检查 401 刷新核心实现：`C:\can\nop\nop-chaos-next\packages\shared\src\http\client.ts`
- 结论是：核心 client 里有 401 刷新去重，但部分关键调用绕过了这条路径

### [维度06-01] 会话恢复请求绕过自动 401 刷新，过期 access token 会被直接当成登录失效
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\services\authApi.ts:86-95`
- **证据片段**:
```ts
86:   const payload = await ajaxQuery<LegacyUserInfoResponse>(
87:     '@query:LoginApi__getLoginUserInfo/username:userName,realname:nickName,roles:roleInfos{value:roleId,roleName}',
88:     {
89:       accessToken: token,
90:     },
91:     {
92:       withAuth: false,
93:       headers: buildTokenHeaders(token),
94:     },
95:   );
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 启动期 `fetchCurrentUser()` 恢复登录态
- **竞态场景**: 本地仍有可用 refresh token，但 access token 已过期时，这个请求显式 `withAuth: false`，会跳过 `packages/shared/src/http/client.ts` 中的 401 刷新/去重逻辑；并发启动请求会直接把一次可恢复的 401 变成“会话失效”
- **用户可见故障**: 刷新页面后被错误登出、启动期 toast 报错、跳回登录页
- **建议**: 不要用 `withAuth: false + 手工塞 token header` 调当前用户接口；改为走受控鉴权路径，或者给 http client 增加“指定 token 但仍允许 refresh/retry”的能力
- **误报排除**: 这里不是匿名接口；代码明确手工注入了 `authorization/x-access-token`，说明它本质上是认证请求，只是绕过了自动刷新链路
- **复核状态**: `未复核`

### [维度06-02] 菜单查询同样绕过 401 刷新去重，关键首屏请求缺少并发恢复能力
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\services\menuApi.ts:14-24`
- **证据片段**:
```ts
14:   const token = useAuthStore.getState().token;
15: 
16:   const payload = await ajaxFetch<LegacySiteMapResponse>('/r/SiteMapApi__getSiteMap', {
17:     method: 'POST',
18:     withAuth: false,
19:     headers: token
20:       ? {
21:           'x-access-token': token,
22:           authorization: `Bearer ${token}`,
23:         }
24:       : undefined,
```
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: React Query 菜单加载 `fetchMenuConfig()`
- **竞态场景**: 首屏菜单请求遇到过期 token 时，不会进入共享 http client 的 401 refresh dedupe；并发菜单/用户信息请求会各自失败，而不是共用一次 refresh
- **用户可见故障**: 导航菜单加载失败、页面初始化异常、可能伴随不必要的登出/错误提示
- **建议**: 菜单接口也应走统一鉴权刷新路径；同时把 query 的 abort signal 一并透传，避免用户切换会话后旧请求继续跑
- **误报排除**: 这里不是公开菜单接口；代码直接从 auth store 取 token 并发 header，说明设计上依赖已登录上下文
- **复核状态**: `未复核`

### [维度06-03] useAuthBootstrap 缺少过期结果保护，旧请求可回写覆盖更新后的登录态
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\hooks\useAuth.ts:34-49`
- **证据片段**:
```ts
34:     const bootstrap = async () => {
35:       const state = useAuthStore.getState();
36: 
37:       if (!state.token) {
38:         state.setBootstrapStatus('anonymous');
39:         return;
40:       }
41: 
42:       try {
43:         state.setBootstrapStatus('pending');
44:         const currentUser = await fetchCurrentUser(state.token);
45:         useAuthStore.getState().setSession({
46:           user: currentUser,
47:           token: state.token,
48:           tokens: state.tokens,
49:         });
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 启动期用户信息拉取
- **竞态场景**: `fetchCurrentUser(state.token)` 发出后，如果用户已退出、重新登录、或 token 已被刷新，成功回调仍会把旧 `state.token/state.tokens` 写回 store
- **用户可见故障**: 账号“回跳”到旧会话、权限错乱、刚退出又被重新置为已登录
- **建议**: 捕获 token 快照并在落库前比对当前 store 中的 token；或引入 AbortController，在会话变化/组件卸载时取消旧请求
- **误报排除**: 这不是普通组件局部状态更新；这里直接写全局 auth store，覆盖面是全应用
- **复核状态**: `未复核`

### [维度06-04] 变更成功后的 refetch 被 fire-and-forget，刷新失败会被成功提示掩盖
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\pages\flow-editor\index.tsx:43-50`
- **证据片段**:
```ts
43:   const actionMutation = useMutation({
44:     mutationFn: async (fn: () => Promise<void>) => fn(),
45:     onSuccess: () => {
46:       void flowQuery.refetch();
47:     },
48:     onError: (error) => {
49:       toast.error(error instanceof Error ? error.message : t('flowEditor.actionFailed'));
50:     },
```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: 删除/复制/启停后列表刷新
- **竞态场景**: 变更请求已成功，但后续 `refetch()` 失败时 promise 被直接丢弃；同时业务代码已经弹出成功 toast
- **用户可见故障**: 用户看到“删除/复制成功”，但列表仍是旧数据，直到手动刷新才发现没同步
- **建议**: `await`/`return flowQuery.refetch()`，或改用 `queryClient.invalidateQueries()` 并对刷新失败单独提示
- **误报排除**: React Query 虽会更新 query 状态，但这里成功反馈已经先发出，且 `refetch` rejection 未被显式处理，属于真实误导性反馈
- **复核状态**: `未复核`

### [维度06-05] extension 加载/setup 无超时与取消保护，单个挂死源可无限阻塞宿主启动
- **文件**: `C:\can\nop\nop-chaos-next\packages\extension-host\src\loadExtensions.ts:56-66`
- **证据片段**:
```ts
56:   for (const source of sources.filter((item) => item.enabled !== false)) {
57:     try {
58:       const mod = await loadExtensionModule(source)
59:       const raw = await resolveExtensionExport(mod)
60:       const extension = normalizeExtension(raw, source)
61: 
62:       await extension.setup?.(context)
63:       loaded.push({ source, extension })
64:     } catch (error) {
65:       const message = error instanceof Error ? error.message : 'Unknown extension load error'
66:       context.logger.error(`Failed to load extension '${source.id}': ${message}`)
```
- **严重程度**: P1
- **问题类别**: 取消安全
- **异步操作**: extension `import()` / `load()` / `setup()`
- **竞态场景**: 某个远程 extension 入口或 `setup()` 永不 resolve 时，这里没有 `Promise.race` 超时，也没有取消；宿主 `bootstrap()` 会一直 await 下去
- **用户可见故障**: 首屏永久空白，既不进入正常应用，也不进入失败 fallback
- **建议**: 给每个 source 的 load/setup 增加超时包裹和错误分级；超时后记录 source id 并跳过该 extension，不能无限卡住宿主
- **误报排除**: 现有 `mainHttpClient` 超时只覆盖 HTTP 请求；这里是动态模块加载和 setup promise，不受其保护
- **复核状态**: `未复核`

### [维度06-06] bootstrapExtensions 的并发去重只在进行中有效，成功后会被重置，重复调用会整套重跑
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\extensions\bootstrap.ts:150-186`
- **证据片段**:
```ts
150: export async function bootstrapExtensions(): Promise<LoadedExtension[]> {
151:   if (bootstrapPromise) {
152:     return bootstrapPromise
153:   }
...
182:   })().finally(() => {
183:     bootstrapPromise = null
184:   })
185: 
186:   return bootstrapPromise
```
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: extension bootstrap 总流程
- **竞态场景**: 首次成功后 `finally` 把 `bootstrapPromise` 清空；后续再次调用会重新加载 extension、重新拉 i18n、重复做注册/合并，而不是复用已完成结果
- **用户可见故障**: 重复网络请求、重复初始化、副作用重入；在未来多入口/重试场景下更容易出现状态抖动
- **建议**: 成功后保留 resolved promise 或单独缓存 bootstrap 结果；仅在失败时重置，符合文档中“成功后复用结果”的约束
- **误报排除**: 虽然当前主入口只直接调用一次，但该 helper 已导出且文档明确声明有并发去重/成功复用合同，这里与合同不一致
- **复核状态**: `未复核`

## 检查范围
- `C:\can\nop\nop-chaos-next\apps\main\src\services\**`
- `C:\can\nop\nop-chaos-next\apps\main\src\**\*.{ts,tsx}` 中的 `async/useQuery/useMutation/fetch/catch`
- `C:\can\nop\nop-chaos-next\packages\shared\src\http\**`
- `C:\can\nop\nop-chaos-next\apps\main\src\extensions\**`
- `C:\can\nop\nop-chaos-next\apps\main\src\plugins\**`
- `C:\can\nop\nop-chaos-next\packages\extension-host\**`

## 首轮未单列为问题的点
- `C:\can\nop\nop-chaos-next\packages\shared\src\http\client.ts` 已实现并发 401 refresh promise 去重
- `C:\can\nop\nop-chaos-next\packages\core\src\components\PluginSlot.tsx` 已有插件加载错误态和 10s 超时展示
- `C:\can\nop\nop-chaos-next\apps\main\src\flux\FluxRouteRenderer.tsx`、`...useFlowEditorState.ts` 已对部分手写异步加载补了 AbortController

## 深挖第 2 轮追加

### [维度06-07] 主从列表删除后的 refetch 仍是 fire-and-forget，刷新失败会被成功提示掩盖
- **文件**: `apps/main/src/pages/data-management/master-detail/index.tsx:55-63,170-173`
- **证据片段**:
```ts
55:   const deleteMutation = useMutation({
56:     mutationFn: async (ids: string[]) => {
57:       await deleteOrders(ids);
58:     },
59:     onSuccess: () => {
60:       setSelectedIds([]);
61:       void orderQuery.refetch();
62:       toast.success(t('masterDetail.batchDeleteSuccess'));
63:     },
```
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: 批量删除/单行删除后的列表刷新
- **竞态场景**: 删除请求成功后立刻弹成功 toast，但 `orderQuery.refetch()` 被 `void` 丢弃；若刷新失败，页面仍保留旧列表或旧选中态，用户只看到“删除成功”
- **用户可见故障**: 删除成功提示与页面数据不一致，已删订单短时间仍显示，用户误判为“后端没删/前端没刷新”
- **建议**: `await`/`return orderQuery.refetch()`，或改为 `queryClient.invalidateQueries()` 并对刷新失败单独提示
- **误报排除**: 成功反馈已经在 mutation 成功时发出，因此刷新失败会直接制造误导性成功状态
- **复核状态**: `未复核`

### [维度06-08] 主从详情保存缺少请求归属校验，旧详情页保存结果可在切换到新 id 后回写覆盖
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:37-41,149-157`
- **证据片段**:
```ts
37:   const { id = '' } = useParams();
38:   const detailQuery = useQuery({
39:     queryKey: ['order-detail', id],
40:     queryFn: () => fetchOrderDetail(id),
41:   });
```
```ts
149:   const saveMutation = useMutation({
150:     mutationFn: saveOrderDetail,
151:     onSuccess: (saved) => {
152:       setSavedState(normalizeOrder(saved));
153:       setDraft(normalizeOrder(saved));
154:       setDirtySections({ items: false, addresses: false, logistics: false });
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 详情页保存 `saveOrderDetail()`
- **竞态场景**: 用户在保存订单 A 后迅速切到订单 B，同一路由 `[id]` 组件实例复用时，A 的保存回调晚到仍会直接 `setDraft/setSavedState`，把当前已切到的 B 页面覆盖成 A 的数据
- **用户可见故障**: 当前详情页“跳回”上一条订单、脏标记被错误清空、保存成功 toast 出现在错误记录上
- **建议**: 保存时捕获 `id`/请求序号快照，在 `onSuccess/onError` 落地前比对当前 active request；或在切换记录时取消/忽略旧保存结果
- **误报排除**: 这里不是单纯的 unmount 后 setState；`[id]` 参数变化时组件通常复用，旧 mutation 成功回调仍可能命中当前详情页状态
- **复核状态**: `未复核`

### [维度06-09] 流程编辑器保存缺少取消与快照校验，旧流程保存结果可在切换流程后回写污染当前编辑态
- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowPersistence.ts:18-40`
- **证据片段**:
```ts
18:   const saveSnapshot = useCallback(async () => {
19:     if (!flowDocument) {
20:       return;
21:     }
...
35:       const saved = await import('../../../services/mockApi').then((m) =>
36:         m.saveFlowDetail(payload),
37:       );
38:       setFlowDocument(saved);
39:       setSavedSnapshot(JSON.stringify({ nodes, edges }));
40:       toast.success(t('flowEditor.editor.saveSuccess'));
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 编辑页保存快照
- **竞态场景**: 用户保存流程 A 后很快切到流程 B，A 的保存 promise 晚到时仍会执行 `setFlowDocument` 和 `setSavedSnapshot`；由于这是当前编辑器实例上的状态写入，B 页面会被 A 的旧保存结果污染
- **用户可见故障**: 编辑器标题/文档状态突然回退到上一流程，dirty 基线错乱，保存成功 toast 出现在错误页面
- **建议**: 为保存引入 `AbortController` 或请求代次校验；落地前比对当前路由 id / 当前 `flowDocument.id`
- **误报排除**: 回调会直接写编辑器核心状态，而且保存函数没有任何“当前流程是否仍匹配”的保护
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度06-10] 主从详情页切换 `id` 时未清空旧草稿，新的详情返回前仍展示并可编辑上一条记录
- **文件**: `apps/main/src/pages/data-management/master-detail/[id]/index.tsx:63-77`
- **证据片段**:
```ts
useEffect(() => {
  if (!detailQuery.data) {
    return;
  }

  const next = normalizeOrder(detailQuery.data);
  const savedSnapshot = savedStateRef.current;

  setDraft((current) => {
    if (current && savedSnapshot && hasOrderChanged(current, savedSnapshot)) {
      return current;
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 路由参数变化后的 `fetchOrderDetail(id)` 详情加载
- **竞态场景**: 从订单 A 切到订单 B 时，组件实例会复用；当前实现只在 `detailQuery.data` 到达后才更新 `draft/savedState`，但不会在 `id` 变化时先清空旧状态。于是 B 的请求尚未返回期间，页面仍保留 A 的草稿与已保存快照。
- **用户可见故障**: URL 已切到 B，但页面短时间继续显示 A；用户可能在 B 地址下误编辑、误保存 A，或错误触发“放弃修改/恢复分区”等操作。
- **建议**: 在 `id` 变化时立即重置 `draft/savedState/dirtySections/errors` 并进入 loading；或引入 `resolvedId`/请求代次校验，未拿到当前 `id` 对应数据前禁止渲染可交互详情内容。
- **误报排除**: 这不是普通加载闪烁；该页的草稿和保存操作都绑定到本地状态，旧记录会在新路由下持续可编辑，存在真实的错单编辑风险。
- **复核状态**: `未复核`

### [维度06-11] 流程编辑页切换 `id` 时未重置旧画布，新流程加载完成前仍可操作上一流程
- **文件**: `apps/main/src/pages/flow-editor/[id]/useFlowEditorState.ts:109-118`
- **证据片段**:
```ts
useEffect(() => {
  const controller = new AbortController();

  void fetchFlowDetail(id, controller.signal)
    .then((payload) => {
      const normalizedNodes = payload.nodes.map((node) => ({
        ...node,
        data: node.data as FlowNodeData,
      })) as FlowNode[];
```
- **严重程度**: P1
- **问题类别**: 竞态
- **异步操作**: 路由参数变化后的 `fetchFlowDetail(id)` 编辑器文档加载
- **竞态场景**: 从流程 A 切到流程 B 时，这里只启动新的异步加载，并未在请求发出前清空 `flowDocument/nodes/edges/savedSnapshot`。因此在 B 返回前，编辑器仍渲染 A 的旧画布和脏态基线。
- **用户可见故障**: 地址栏已是 B，但标题、节点、边、保存按钮仍对应 A；用户可能误修改、误保存旧流程，随后界面再突然切换成 B。
- **建议**: 在 `id` 变化时先重置编辑器核心状态并展示 loading/skeleton；同时用当前路由 `id` 或请求序号做落地校验。
- **误报排除**: 这里虽已使用 `AbortController` 防止旧请求回写，但没有解决“新请求未完成前仍展示并允许操作旧文档”的窗口。
- **复核状态**: `未复核`

### [维度06-12] AI 工作台允许并发流式回复，共享取消引用会导致多次生成互相踩踏
- **文件**: `apps/main/src/pages/ai-workbench/index.tsx:44-47,241-243,301,325`
- **证据片段**:
```ts
const stopStreamRef = useRef(false);
const streamTimerRef = useRef<number | null>(null);
const streamDelayResolveRef = useRef<(() => void) | null>(null);

const streamAssistantReply = async (sessionId: string, prompt: string) => {
  clearPendingStreamDelay();
  stopStreamRef.current = false;
```
- **严重程度**: P1
- **问题类别**: 取消安全
- **异步操作**: AI 回复逐字流式生成与停止/重生成控制
- **竞态场景**: 页面级只维护一套 `stopStreamRef/streamTimerRef/streamDelayResolveRef`，但发送与重生成都会再次调用 `streamAssistantReply()`。前一次流未结束时再次触发生成，新任务会重置共享 stop 标记并覆盖共享 delay/timer，导致多个 in-flight 流互相影响。
- **用户可见故障**: 回复内容交织、停止按钮停错流、刚点击停止又继续输出、`streaming` 状态被旧任务提前拉回 `false`。
- **建议**: 强制同一时刻仅允许一个 in-flight stream；在流式生成期间禁用发送/重生成入口；为每次生成分配独立 request id 或 `AbortController` 与定时器。
- **误报排除**: 问题根源不是“多点几次按钮会重复发送”，而是多个异步流共享同一套取消与延迟引用，属于真实的跨任务取消污染。
- **复核状态**: `未复核`

## 维度复核结论

- [维度06-01]: 保留 (P1)。`authApi.ts` 仍以 `withAuth: false + 手工 token header` 调当前用户接口，绕过 401 refresh/retry 链路。
- [维度06-02]: 保留 (P2)。`menuApi.ts` 仍绕过统一鉴权刷新，且未透传 React Query abort signal。
- [维度06-03]: 保留 (P1)。`useAuth.ts` 在 `await fetchCurrentUser()` 后仍直接回写旧 `state.token/state.tokens`，无会话归属校验。
- [维度06-04]: 降级 (P3)。`void flowQuery.refetch()` 仍可能误导成功提示，但 query error UI 仍可暴露失败。
- [维度06-05]: 保留 (P1)。`loadExtensions.ts` 对 `load()/import()/setup()` 仍无超时与取消保护。
- [维度06-06]: 降级 (P3)。`bootstrap.ts` 成功后仍清空 `bootstrapPromise`，但当前实际触发面较窄。
- [维度06-07]: 降级 (P3)。主从列表删除后的 `void orderQuery.refetch()` 仍主要是成功 toast 掩盖刷新失败。
- [维度06-08]: 保留 (P1)。主从详情保存仍缺 `id`/请求代次校验，旧保存结果可覆盖当前详情态。
- [维度06-09]: 保留 (P1)。流程编辑器保存完成后仍无当前流程归属校验，旧保存结果可污染新流程页面。
- [维度06-10]: 保留 (P1)。主从详情切换 `id` 时仍未先清空旧草稿，旧记录在新路由下可继续编辑。
- [维度06-11]: 保留 (P1)。流程编辑页切换 `id` 时仍未先重置旧画布，旧文档在新数据到达前继续可操作。
- [维度06-12]: 保留 (P1)。AI 工作台仍允许并发流式回复，多个流共享取消与定时器引用。

## 子项复核结论

- [维度06-01]: 子项复核通过。当前用户恢复请求仍绕过统一 401 刷新链路。
- [维度06-03]: 子项复核通过。`useAuthBootstrap()` 成功/失败回调仍无会话归属校验。
- [维度06-05]: 子项复核通过。extension `load()/setup()` 仍无超时与取消保护。
- [维度06-08]: 子项复核通过。主从详情保存结果仍可在切换记录后回写污染当前页。
- [维度06-09]: 子项复核通过。流程保存结果仍可在切换流程后污染当前编辑态。
- [维度06-10]: 子项复核通过。详情页切换 `id` 时旧草稿仍在新 URL 下继续展示并可编辑。
- [维度06-11]: 子项复核通过。流程编辑页切换 `id` 时旧画布仍在新流程加载前继续可操作。
- [维度06-12]: 子项复核通过。AI 工作台的并发流仍共享同一套取消/定时器引用。
