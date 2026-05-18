# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

已先阅读 `C:\can\nop\nop-chaos-next\docs\index.md` 与 `C:\can\nop\nop-chaos-next\AGENTS.md`，并完成维度 02 第 1 轮初审。

### [维度02-01] 主从列表页将查询、批量操作、导出、分页、排序、导航全部堆在入口页
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\pages\data-management\master-detail\index.tsx:68-195,197-500`
- **证据片段**:
```ts
68:   const [selectedIds, setSelectedIds] = useState<string[]>([]);
69:   const [keyword, setKeyword] = useState('');
70:   const [status, setStatus] = useState<StatusFilter>('all');
71:   const [channel, setChannel] = useState('');
72:   const [owner, setOwner] = useState('');
73:   const [dateFrom, setDateFrom] = useState('');
74:   const [dateTo, setDateTo] = useState('');
75:   const [showMore, setShowMore] = useState(false);
76:   const [page, setPage] = useState(1);
77:   const [pageSize, setPageSize] = useState(5);
```
- **严重程度**: P1
- **现状**: 入口页同时持有查询筛选、排序、选中态、批量删除、导出下载、分页、tab 打开、路由跳转和整张表格渲染。它不是“只负责组装子模块”的 orchestrator，因为核心行为本身都直接写在页文件里。
- **风险**: 后续任何一个交互变化都会触发整页修改；筛选/排序/批量操作之间耦合高，容易再次膨胀成不可测试的大页面。
- **建议**: 拆成 `useMasterDetailListState`、`MasterDetailFilters`、`MasterDetailTable`、`useOrderBulkActions`；将导出/删除/打开详情等行为从页面 JSX 中抽离。
- **误报排除**: 如果只是 orchestrator，页文件应主要做数据装配与子组件拼接；但这里连 Blob 导出、选中逻辑、排序函数、tab 注册都在入口中内联实现。
- **复核状态**: `未复核`

### [维度02-02] 主从详情页虽已拆 section，但入口仍持有完整编辑器状态机
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\pages\data-management\master-detail\[id]\index.tsx:42-322,323-429`
- **证据片段**:
```ts
42:   const [draft, setDraft] = useState<OrderRecord | null>(null);
43:   const [savedState, setSavedState] = useState<OrderRecord | null>(null);
44:   const [dirtySections, setDirtySections] = useState<DirtySections>({
45:     items: false,
46:     addresses: false,
47:     logistics: false,
48:   });
49:   const [addressDialogOpen, setAddressDialogOpen] = useState(false);
50:   const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
51:   const [logisticsOpen, setLogisticsOpen] = useState(false);
```
- **严重程度**: P1
- **现状**: 页面已经引入多个 section 组件，但入口仍承担数据归一化、脏态管理、离开保护、校验、保存、恢复、地址/物流编辑等完整编辑器职责。不是合理 orchestrator。
- **风险**: section 组件只是“展示壳”，真正复杂度继续堆在入口，导致后续难以独立测试 items/addresses/logistics 三条编辑链路。
- **建议**: 继续下沉为 `useOrderDraftController`、`useDirtyGuard`、`useAddressEditor`、`useLogisticsEditor`；页面只保留 query + section 装配。
- **误报排除**: 若这是合格 orchestrator，新增 section 不应持续增加入口逻辑；但当前保存、回滚、局部 restore、校验和弹层编辑均集中在入口。
- **复核状态**: `未复核`

### [维度02-03] AI 工作台入口页混合会话状态、流式回复、侧栏拖拽与页面装配
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src\pages\ai-workbench\index.tsx:29-274,276-396`
- **证据片段**:
```ts
178:   const streamAssistantReply = async (sessionId: string, prompt: string) => {
179:     stopStreamRef.current = false;
180:     const reply = createMockAiReply(prompt, selectedAssistantId, contextEnabled, contextSummary);
181:     const assistantMessageId = `assistant-${Date.now()}`;
182:     updateSession(sessionId, (session) => ({
183:       ...session,
184:       updatedAt: t('aiWorkbench.timestamps.justNow'),
185:       messages: [
186:         ...session.messages,
187:         {
```
- **严重程度**: P2
- **现状**: 页面入口直接实现会话 CRUD、历史加载、流式输出、停止/重生成、剪贴板复制、侧栏宽度拖拽监听。它不是单纯编排 `SessionSidebar/ConversationPanel/ContextPanel` 的 orchestrator。
- **风险**: UI 变更会连带改动流式行为；状态源过多，后续接入真实 AI API 时会放大重构成本。
- **建议**: 抽出 `useWorkbenchSessions`、`useStreamReply`、`useResizableSidebar`；把 mock streaming 循环从页面移到 hook/service。
- **误报排除**: 虽然已有 3 个子面板，但业务状态与副作用并未下沉，复杂度仍在页入口。
- **复核状态**: `未复核`

### [维度02-04] amis ajax 核心文件混入传输层、页面协议、下载副作用与 schema 绑定
- **文件**: `C:\can\nop\nop-chaos-next\packages\amis-core\src\core\ajax.ts:14-407`
- **证据片段**:
```ts
254:   if (type === 'page') {
255:     const schema = await adapter.pageProvider.getPage(path);
256:     const transformedSchema = await transformPageJson(schema);
257:     const boundSchema = options._page
258:       ? await bindActions(transformedSchema, options._page)
259:       : transformedSchema;
260:     return buildSuccessResponse(boundSchema);
```
- **严重程度**: P1
- **现状**: 一个 `ajax.ts` 同时负责错误文案、blob 下载、GraphQL 请求变换、auth client 创建、特殊前缀协议（action/dict/page）、page schema transform/bind。它不是合理 orchestrator，而是低层核心文件承担了过多横切职责。
- **风险**: 任一协议或响应处理调整都可能误伤其它路径；测试面也会继续扩大，形成“改一个点跑全套”的核心耦合文件。
- **建议**: 至少拆成 `transport.ts`、`specialRequest.ts`、`blobResponse.ts`、`messageCatalog.ts`；`ajax.ts` 只保留总调度。
- **误报排除**: 若是 orchestrator，应主要调用独立模块；但当前页面 schema 获取与绑定、下载行为、网络错误归一都直接实现于本文件。
- **复核状态**: `未复核`

### [维度02-05] flux UI 根入口以 55 个 `export *` 镜像内部文件树，公开面过宽
- **文件**: `C:\can\nop\nop-chaos-next\flux-lib\ui\src\index.ts:1-67`
- **证据片段**:
```ts
1: export * from './components/ui/accordion.js';
2: export * from './components/ui/alert.js';
3: export * from './components/ui/alert-dialog.js';
4: export * from './components/ui/aspect-ratio.js';
5: export * from './components/ui/avatar.js';
6: export * from './components/ui/badge.js';
7: export * from './components/ui/breadcrumb.js';
8: export * from './components/ui/button.js';
```
- **严重程度**: P1
- **现状**: 根入口基本等于“把内部组件目录整包暴露”，并且还直接转出 `sonner` 的 `toast`。这不是合理 orchestrator，而是将内部实现结构直接变成对外 API。
- **风险**: 公共面失控，内部重命名/重组会变成破坏性变更；消费者也更容易依赖偶然暴露的实现细节。
- **建议**: 收敛为显式导出清单；按稳定层次分 `components`、`feedback`、`hooks`、`utils` 子入口；避免在根入口直接透传第三方实现。
- **误报排除**: 纯 re-export 入口并非一定有问题，但这里是大规模 `export *` 镜像内部树，属于 API 面失控，不是“精选公开接口”。
- **复核状态**: `未复核`

### [维度02-06] plugin-bridge 根入口混入 hooks/fallback 实现，并暴露底层 bridge 读写接口
- **文件**: `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts:1-76`
- **证据片段**:
```ts
37: export function usePluginBridge(): PluginBridge | undefined {
38:   return useSyncExternalStore(subscribePluginBridge, getPluginBridge, getPluginBridge);
39: }
40: 
41: export function usePluginBridgeSnapshot(): BridgeSnapshot {
42:   return useSyncExternalStore(
43:     subscribeBridgeSnapshot,
44:     getPluginBridgeSnapshot,
45:     getPluginBridgeSnapshot,
46:   );
```
- **严重程度**: P2
- **现状**: 根入口除了导出类型，还实现了多组 hooks、fallback 值，并直接暴露 `set/get/subscribe` 级别底层接口。它不是纯入口编排。
- **风险**: 公开 API 与内部存储模型绑定过深；后续若替换 bridge 存储机制，根入口兼容成本高。
- **建议**: 将 hooks 下沉到 `hooks.ts`，将低层 bridge store API 与公共 hooks API 分层；根入口仅选择性导出稳定接口。
- **误报排除**: 若只是入口文件，通常不应承载 `useSyncExternalStore` 细节和 fallback runtime 行为；这里已明显越过边界。
- **复核状态**: `未复核`

### [维度02-07] 多个 src 根目录存在单文件/双文件子目录，出现轻度过度拆分
- **文件**: `C:\can\nop\nop-chaos-next\apps\main\src`, `C:\can\nop\nop-chaos-next\packages\amis-core\src`, `C:\can\nop\nop-chaos-next\packages\core\src`, `C:\can\nop\nop-chaos-next\flux-lib\ui\src`
- **证据片段**:
```ts
apps/main/src: small_dirs=['constants/(1f,0d)', 'lib/(1f,0d)']
packages/amis-core/src: small_dirs=['adapter/(1f,0d)', 'test-helpers/(1f,0d)']
packages/core/src: small_dirs=['hooks/(2f,0d)', 'types/(1f,0d)']
flux-lib/ui/src: small_dirs=['components/(0f,2d)', 'hooks/(2f,0d)', 'styles/(2f,0d)']
```
- **严重程度**: P3
- **现状**: 若干顶层子目录只有 1-2 个文件，形成“为目录而目录”的跳层结构。它们不是合理 orchestrator 边界，因为并未承载稳定子域，只增加路径层级。
- **风险**: 根目录认知负担上升；后续新增文件容易继续沿着弱边界扩散，形成命名和归属漂移。
- **建议**: 合并明显单例目录；如 `apps/main/src/lib/tableRowClassName.ts` 可并入更明确的 `utils`/feature 内；`packages/core/src/types/systemjs.d.ts` 可贴近 `utils/systemjs.ts`；`packages/amis-core/src/adapter/index.ts` 若短期不扩展，可扁平化。
- **误报排除**: 小目录不必然有问题，但这里多个目录同时只有 1-2 个文件，且未体现独立子域演进趋势，属于边界名义化。
- **复核状态**: `未复核`

## 超大文件清单（带职责分析）
代码候选（排除大测试文件）共 8 个；本轮均已初审；`>700` 文件为 0。

- `C:\can\nop\nop-chaos-next\apps\main\src\pages\data-management\master-detail\index.tsx`（约 501）
  职责：列表查询 + 高级筛选 + 排序 + 选择 + 批量操作 + 导出 + 分页 + 导航。
  结论：职责混合，P1。

- `C:\can\nop\nop-chaos-next\apps\main\src\pages\data-management\master-detail\[id]\index.tsx`（约 430）
  职责：详情加载 + draft/savedState + 脏区 + 校验 + section restore/save + 弹层编辑。
  结论：职责混合，P1。

- `C:\can\nop\nop-chaos-next\packages\amis-core\src\core\ajax.ts`（约 421）
  职责：请求适配 + 特殊协议 + GraphQL + blob 下载 + 错误归一 + client 缓存。
  结论：职责混合，P1。

- `C:\can\nop\nop-chaos-next\apps\main\src\pages\ai-workbench\index.tsx`（约 397）
  职责：会话态 + mock streaming + 侧栏 resize + 历史加载 + 页面装配。
  结论：职责偏混合，P2。

- `C:\can\nop\nop-chaos-next\flux-lib\ui\src\components\ui\chart.tsx`（约 371）
  职责：同一复合组件族（container/style/tooltip/legend/helpers）。
  结论：当前更像生成式 compound primitive，边界仍可接受；暂不列主问题。

- `C:\can\nop\nop-chaos-next\packages\core\src\components\TabsBar.tsx`（约 370）
  职责：单一 TabsBar 组件，含滚动、菜单、全屏按钮。
  结论：边界基本一致，属“复杂单组件”，暂不列主问题。

- `C:\can\nop\nop-chaos-next\apps\main\vite.config.ts`（约 334）
  职责：chunk 分组、alias、代理、build 配置。
  结论：配置密集但主题一致，暂不列主问题。

- `C:\can\nop\nop-chaos-next\apps\main\src\router\AppShell.tsx`（约 317）
  职责：shell 组装、菜单本地化、tab 同步、全屏、登出。
  结论：接近 orchestrator，虽偏大但仍有可接受性，暂不列主问题。

- `C:\can\nop\nop-chaos-next\flux-lib\ui\src\components\ui\sidebar-layout.tsx`（约 306）
  职责：一组 sidebar layout primitives。
  结论：同属 compound primitive，暂不列主问题。

大测试文件候选（本轮只做记录，不作为主发现）：
- `C:\can\nop\nop-chaos-next\packages\shared\src\http\client.test.ts`
- `C:\can\nop\nop-chaos-next\packages\extension-host\src\index.test.ts`
- `C:\can\nop\nop-chaos-next\packages\amis-core\src\core\ajax.test.ts`
- `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.test.ts`
- `C:\can\nop\nop-chaos-next\packages\amis-core\src\core\graphqlArgs.test.ts`
- `C:\can\nop\nop-chaos-next\packages\shared\src\utils\menu.test.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\services\menuMapper.test.ts`
- `C:\can\nop\nop-chaos-next\packages\shared\src\auth\tokenManager.test.ts`
- `C:\can\nop\nop-chaos-next\packages\shared\src\utils\menuConfig.test.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\extensions\index.test.ts`
- `C:\can\nop\nop-chaos-next\apps\main\src\services\mockApi\mockApi.test.ts`

## 入口文件问题
- 有问题：
  - `C:\can\nop\nop-chaos-next\flux-lib\ui\src\index.ts`：55 个 `export *`，公开面过宽，并直接透传第三方 `toast`。
  - `C:\can\nop\nop-chaos-next\packages\plugin-bridge\src\index.ts`：不是纯 re-export，混入 hooks/fallback/runtime 细节。
- 基本可接受：
  - `C:\can\nop\nop-chaos-next\packages\shared\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\core\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\amis-core\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\amis-react\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\extension-host\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\theme-tokens\src\index.ts`
  - `C:\can\nop\nop-chaos-next\packages\tailwind-preset\src\index.ts`

## 目录结构建议
- 收敛 `apps/main/src` 根层级，优先处理单例目录：`constants/`、`lib/`。
- `packages/core/src/types/systemjs.d.ts` 可贴近 `utils/systemjs.ts`。
- `packages/amis-core/src/adapter/`、`test-helpers/` 若短期不扩展，可扁平化。
- `flux-lib/ui/src/components/` 当前根层为空壳目录，若仅作为中转层，可评估减少一级。

## 待基线确认项
- 你给的基线行数与工具读取总行数存在普遍 `-1` 差异；按“末尾无换行也算一行”的统计方式，候选文件与基线基本一致。
- `packages/ui/src/index.ts` 在当前仓库中不存在；UI 公开入口实际为 `C:\can\nop\nop-chaos-next\flux-lib\ui\src\index.ts`。

## 深挖第 2 轮追加

### [维度02-08] `AppShell` 仍是被遗漏的壳层入口职责混合点
- **文件**: `apps/main/src/router/AppShell.tsx:77-209,211-305`
- **证据片段**:
```ts
77:   useEffect(() => {
82:     registerTab({
...
94:   useEffect(() => {
95:     const syncFullscreenState = () => {
96:       setWorkspaceFullscreen(document.fullscreenElement === shellRef.current);
...
144:   useEffect(() => {
160:     const handleKeyDown = (event: KeyboardEvent) => {
...
183:   const handleLogout = async () => {
197:       await logoutRequest(token);
...
211:   const shellSidebar = (
```
- **严重程度**: P2
- **现状**: 这个壳层入口不只是 layout orchestrator。它直接承载了 tab 注册/同步、fullscreen DOM 生命周期、快捷键监听、登出确认与远端登出、副作用 toast，以及桌面/移动两套 sidebar 拼装。属于“入口实现逻辑泄露”。
- **风险**: 壳层行为修改会不断膨胀到一个中心文件，布局、导航、键盘、全屏、退出流程相互缠绕，后续测试与重构成本持续上升。
- **建议**: 拆出 `useShellFullscreen`、`useShellLogout`、`useShellTabsSync`，并把 sidebar 组装下沉为独立 shell section 组件。
- **误报排除**: 这不是单纯的大组件；关键副作用与宿主状态管理逻辑都在入口内联，已超过合理壳层编排边界。
- **复核状态**: `未复核`

### [维度02-09] 主包体积策略工具脚本已演化成 690 行“打包边界总控文件”
- **文件**: `scripts/main-bundle-utils.mjs:10-26,193-220,317-468,474-690`
- **证据片段**:
```js
10: const WORKSPACE_ROOTS = ['apps', 'packages', 'examples', 'flux-lib'];
18: const MAIN_EXTERNAL_RUNTIME_DEPENDENCY_POLICIES = [
...
193: export function createMainPackageContext(rootDir = repoRoot) {
...
317: export function resolveMainRuntimeOverrideTarget(rootDir = repoRoot, packageName) {
...
423: export function getMainExternalPackageAliases(rootDir = repoRoot) {
...
494: export function getVendorChunkName(packageName) {
...
680: export function getPackageChunkName(packageName) {
```
- **严重程度**: P1
- **现状**: 该文件同时负责 workspace 扫描、外部包解析、运行时 override、alias 生成、缺失构建产物校验、chunk 命名策略。不是单一“bundle util”，而是把多类构建边界压进了一个核心脚本。
- **风险**: 任一打包边界策略调整都要改同一个大文件，容易相互误伤；这类构建基线脚本一旦膨胀，问题通常会扩散到所有消费者和 CI。
- **建议**: 至少拆成 `workspace-context`、`external-resolution`、`override-policy`、`chunk-naming`、`alias-generation` 等模块。
- **误报排除**: 这不是普通配置文件偏长；文件内承载的是多套独立策略与派生逻辑，已超出“单脚本集中配置”的合理范围。
- **复核状态**: `未复核`

### [维度02-10] 扩展脚本生成器把 CLI、宿主集成、模板系统全部内联进单文件
- **文件**: `scripts/generate-extension.mjs:85-108,189-309,346-424,520-594`
- **证据片段**:
```js
85: async function updateMainAppIntegration({ devPort, packageName, slug }) {
...
189: function createIndexTs({
...
346: function createPageComponent(pageFileName, title, componentId, menuPath) {
...
520: function createFiles(config) {
...
540: async function main() {
```
- **严重程度**: P2
- **现状**: 它同时承担参数校验、仓库根脚本补丁、主应用 env 接入、extension manifest 模板、页面模板、样式模板、README/Vite/Tailwind 模板。后续任何脚手架调整都要改一个超长字符串拼装文件。
- **风险**: 生成器的任何小改动都容易影响宿主集成和模板输出多个维度，回归难定位，也不利于模板复用与测试。
- **建议**: 拆成 `cli/`、`templates/`、`host-integration/`、`writers/`，模板改为独立文件或最少分模块。
- **误报排除**: 问题不在脚手架本身，而在于模板与宿主补丁逻辑高度耦合于单文件，边界已明显失衡。
- **复核状态**: `未复核`

### [维度02-11] `@nop-chaos/ui` 的物理目录与逻辑包边界持续错位
- **文件**: `AGENTS.md:23-26`; `packages/ui/README.md:1-9`; `tsconfig.base.json:34-35`; `pnpm-workspace.yaml:1-5`; `flux-lib/ui/package.json:1-26`
- **证据片段**:
```md
packages/ui/README.md
3: This package lives at **`flux-lib/ui/`** (not under `packages/`).

tsconfig.base.json
34: "@nop-chaos/ui": ["flux-lib/ui/src/index.ts"]

pnpm-workspace.yaml
2:   - apps/*
3:   - packages/*
4:   - examples/*
5:   - flux-lib/*
```
- **严重程度**: P2
- **现状**: 仓库认知模型说共享包在 `packages/ui`，但真实源码、workspace 包、TS alias 都指向 `flux-lib/ui`，`packages/ui` 只是占位 README。目录层级错位会持续干扰包归属、搜索路径和文档心智模型。
- **风险**: 开发者会持续在“逻辑包名”和“物理目录位置”之间来回切换，增加误查、误配、脚本扫描偏差和文档漂移。
- **建议**: 二选一收敛：要么正式把 UI 包迁回 `packages/ui`，要么在仓库文档与边界定义中把 `flux-lib/ui` 提升为一等共享包目录。
- **误报排除**: 这不是单纯历史注释问题；`packages/ui` 占位目录、`flux-lib/ui` 实包、TS alias、workspace pattern 都同时在 live 仓库中生效。
- **复核状态**: `未复核`

## 深挖第 3 轮追加

### [维度02-12] `extension-host/runtime.ts` 将扩展注册表、Shell 配置存储、配置归并、菜单覆盖策略压在同一运行时文件
- **文件**: `packages/extension-host/src/runtime.ts:9-10,91-138,140-197,207-239`
- **证据片段**:
```ts
9: let loadedExtensions: LoadedExtension[] = []
91: let shellRuntimeConfig: ShellRuntimeConfig = defaultShellRuntimeConfig
100: export function setLoadedExtensions(extensions: LoadedExtension[]) {
140: export function resolveShellRuntimeConfig(extensions: LoadedExtension[]): ShellRuntimeConfig {
207: export function mergeExtensionMenus(menuResponse: MenuResponse): MenuResponse {
```
- **严重程度**: P1
- **现状**: 同一文件同时承担扩展列表全局状态、Shell runtime config store/subscribe、branding/loginUi/systemPages 归并规则、菜单 override/merge 规则，已不是单一“runtime”边界。
- **风险**: 扩展系统任一变化都会回流到这个核心文件，导致策略耦合、测试面扩大、后续替换存储或合并规则时更容易互相误伤。
- **建议**: 拆为 `extensionRegistry.ts`、`shellRuntimeConfigStore.ts`、`resolveShellRuntimeConfig.ts`、`mergeExtensionMenus.ts`；`runtime.ts` 仅做稳定 API 汇总。
- **误报排除**: 若它只是 orchestrator，应主要串联独立模块；但当前全局状态、订阅机制、归并实现、菜单策略都直接内联在本文件中。
- **复核状态**: `未复核`

### [维度02-13] 扩展启动入口把 DOM 注入、宿主注册、认证重置、主题语言接入、远程 i18n 拉取全部内联
- **文件**: `apps/main/src/extensions/bootstrap.ts:21-47,49-122,132-162,164-200`
- **证据片段**:
```ts
21: function ensureStylesheet(id: string, href: string) {
49: function applyDocumentBranding(loaded: LoadedExtension[]) {
63: function applyExtensionDefinitions(loaded: LoadedExtension[]) {
132: export async function loadExtensionI18nFromBaseUrl(loaded: LoadedExtension[]) {
164: export async function bootstrapExtensions(): Promise<LoadedExtension[]> {
```
- **严重程度**: P1
- **现状**: 启动入口不只是 bootstrap 编排；它直接实现了 `<link>` 注入、标题/favicon 更新、auth/resetTokenStorage、语言/主题/插件/内建页注册，以及扩展 i18n 资源远程加载。
- **风险**: 任一扩展贡献能力新增或修改都会持续膨胀这个入口；启动失败也更难定位到底是 DOM 资源、宿主注册还是 i18n 拉取问题。
- **建议**: 下沉为 `domBranding.ts`、`applyExtensionContributions.ts`、`extensionI18n.ts`、`bootstrapExtensions.ts`；入口只保留加载顺序与错误边界。
- **误报排除**: 如果只是启动 orchestrator，文件应主要顺序调用子模块；但这里连底层 DOM/link 操作与各类贡献应用循环都在入口里直接实现。
- **复核状态**: `未复核`

## 维度复核结论

- [维度02-01]: 保留 (P1)。主从列表页仍把查询、排序、选择、批量删除、导出、分页、导航与表格渲染堆在单页入口。
- [维度02-02]: 保留 (P1)。主从详情页入口仍集中 draft/savedState、脏态守卫、校验、保存回滚、地址/物流编辑等状态机。
- [维度02-03]: 保留 (P2)。AI 工作台入口仍同时管理 sessions、mock streaming、历史加载、复制、拖拽与页面装配。
- [维度02-04]: 保留 (P1)。`packages/amis-core/src/core/ajax.ts` 仍承担 special request、GraphQL、HTTP client、blob 下载、错误消息与通知等多重职责。
- [维度02-05]: 驳回。`flux-lib/ui/src/index.ts` 虽导出面宽，但对组件库根入口来说仍属公共 API 汇总的单一职责。
- [维度02-06]: 驳回。`packages/plugin-bridge/src/index.ts` 体量小，暴露 hooks/fallback/bridge 访问仍围绕同一 plugin bridge API。
- [维度02-07]: 驳回。若干小目录语义稳定，仅凭 1-2 文件不足以判定过度拆分。
- [维度02-08]: 降级 (P3)。`AppShell.tsx` 偏大且含 tabs/fullscreen/logout/sidebar 逻辑，但仍属于 shell 层同域职责。
- [维度02-09]: 降级 (P2)。`scripts/main-bundle-utils.mjs` 很长且含多套策略，但整体仍服务 main bundle 构建域。
- [维度02-10]: 降级 (P3)。`scripts/generate-extension.mjs` 的聚合问题成立，但更偏脚手架维护成本。
- [维度02-11]: 保留 (P2)。`@nop-chaos/ui` 的逻辑包边界与物理目录位置确有真实错位。
- [维度02-12]: 降级 (P2)。`packages/extension-host/src/runtime.ts` 聚合偏重，但仍围绕 extension-host runtime。
- [维度02-13]: 降级 (P2)。`apps/main/src/extensions/bootstrap.ts` 很重，但仍属于 bootstrap 流程内部聚合。

## 子项复核结论

- [维度02-01]: 子项复核通过。列表页入口仍直接承担筛选、排序、选择、批量删除、导出、分页、tab 打开与路由跳转，P1 保留。
- [维度02-02]: 降级为 P2。详情页入口仍重，但已拆出多个 section / dialog / utils，原 P1 表述偏重。
- [维度02-04]: 子项复核通过。`packages/amis-core/src/core/ajax.ts` 仍是多协议、多副作用、多传输策略混合的高耦合核心文件，P1 保留。
