# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] PluginStore 使用双 localStorage key 持久化同一份数据，写入后两 key 永久分叉

- **文件**: `apps/main/src/store/pluginStore.ts:12` + `apps/main/src/services/mockApi/plugins.ts:4`
- **证据片段**:
  ```ts
  // pluginStore.ts:12 — Zustand persist 使用 key 'plugins:v1'
  const initialPlugins = getPluginSeeds();
  persist(
    (set) => ({ plugins: initialPlugins, ... }),
    { name: 'plugins:v1', storage: createJSONStorage(() => localStorage) },
  )

  // plugins.ts:4 — mock API 使用不同的 key 'plugins:manifests:v1'
  const pluginStorageKey = 'plugins:manifests:v1';
  export function getPluginSeeds(): PluginManifest[] {
    return readStoredJson(pluginStorageKey, seedPluginManifests);
  }
  ```
- **严重程度**: P2
- **现状**: Zustand store 持久化到 `plugins:v1`；mock API `fetchPluginList` 从 `plugins:manifests:v1` 读取。用户通过 `updatePlugin` 修改插件后，仅 `plugins:v1` 被更新，`plugins:manifests:v1` 永远停留在初始种子数据。
- **风险**: 如果后续开发新增功能依赖 `fetchPluginList` 返回最新数据，将读到过期数据。数据分叉属于结构性隐患。
- **建议**: 统一为单一持久化 key。方案 A：让 Zustand persist 成为唯一写入方；方案 B：移除 Zustand persist，让 mock API 的 readStoredJson/writeStoredJson 成为唯一通道。
- **双状态详情**: `localStorage['plugins:v1']`（Zustand persist 写入）与 `localStorage['plugins:manifests:v1']`（mock API 读取）存储同一份 plugin 列表。
- **同步失败症状**: 若开发者新增基于 `fetchPluginList` 的功能，该功能将始终返回初始种子数据而非用户修改后的状态。
- **误报排除**: 两个 key 保存的是完全同构的 `PluginManifest[]`，不存在字段裁剪或格式差异的需求。
- **复核状态**: 未复核

### [维度04-02] PluginStore 在模块作用域执行 I/O 读操作，耦合模块加载与存储

- **文件**: `apps/main/src/store/pluginStore.ts:4,12`
- **证据片段**:
  ```ts
  // pluginStore.ts:4 — 导入 mockApi
  import { getPluginSeeds } from '../services/mockApi';
  // pluginStore.ts:12 — 模块顶层调用，触发 localStorage 读取
  const initialPlugins = getPluginSeeds();
  ```
- **严重程度**: P3
- **现状**: `getPluginSeeds()` 在模块导入时同步读取 localStorage。Zustand persist 中间件随后会从 `plugins:v1` 水合数据并覆盖此初始值。首次访问之后的所有加载中，`initialPlugins` 的值都被丢弃，这次 I/O 是浪费的。
- **风险**: (1) 每次 import 触发无意义 localStorage 读取。(2) store 依赖 services/mockApi 层，违反分层原则。(3) 测试需要 vi.mock + vi.resetModules 隔离。
- **建议**: 将初始值设为空数组 `[]`，让 persist 中间件负责从 `plugins:v1` 水合。
- **双状态详情**: 不涉及双状态，但模块级 I/O 结果与 persist 水合结果存在冗余覆盖关系。
- **同步失败症状**: 无可见 UI 症状。
- **误报排除**: 可以用 `[]` 作为安全默认值，由业务逻辑按需填充。
- **复核状态**: 未复核

### [维度04-03] PluginsManagementPage 中 React Query 缓存与 Zustand store 维护同一份插件列表，同步条件过于脆弱

- **文件**: `apps/main/src/pages/plugins/management/index.tsx:31-44`
- **证据片段**:
  ```ts
  const pluginQuery = useQuery({ queryKey: ['plugins'], queryFn: fetchPluginList });
  const plugins = usePluginStore((state) => state.plugins);
  const setPlugins = usePluginStore((state) => state.setPlugins);
  const updatePlugin = usePluginStore((state) => state.updatePlugin);

  useEffect(() => {
    if (pluginQuery.data && plugins.length === 0) {
      setPlugins(pluginQuery.data);
    }
  }, [pluginQuery.data, plugins.length, setPlugins]);

  const items = plugins.length > 0 ? plugins : (pluginQuery.data ?? []);
  ```
- **严重程度**: P2
- **现状**: 同一页面持有两份插件列表数据——React Query 缓存和 Zustand store。同步 useEffect 仅在 `plugins.length === 0` 时触发，是一次性单向同步。
- **风险**: (1) `updatePlugin` 修改 store 后，React Query 缓存不会失效。(2) 引入新开发者时两个数据源增加理解成本。
- **建议**: 选择单一数据源。移除 `useQuery` 或移除 Zustand store 的 plugin 持久化。
- **双状态详情**: `usePluginStore.plugins` 与 `pluginQuery.data` 表达同一份插件列表。
- **同步失败症状**: 若用户清除 `plugins:v1`，之前所有修改丢失。
- **误报排除**: 当前 `fetchPluginList` 是纯 localStorage 读取，React Query 的缓存机制在此场景下无实际作用。
- **复核状态**: 未复核

### [维度04-04] authStore 中 login 与 setSession 方法实现完全相同，语义重复

- **文件**: `apps/main/src/store/authStore.ts:52-67`
- **证据片段**:
  ```ts
  login: ({ user, token, tokens }) =>
    set({
      user,
      token,
      tokens,
      isAuthenticated: true,
      bootstrapStatus: 'ready',
    }),
  setSession: ({ user, token, tokens }) =>
    set({
      user,
      token,
      tokens,
      isAuthenticated: true,
      bootstrapStatus: 'ready',
    }),
  ```
- **严重程度**: P3
- **现状**: `login` 和 `setSession` 接受相同参数类型，执行完全相同的状态更新。
- **风险**: 会误导后续开发者。
- **建议**: 保留一个方法，命名为 `setSession`，删除或 deprecate `login`。
- **双状态详情**: 不涉及双状态。
- **同步失败症状**: 无。
- **误报排除**: 当前代码中两者确实完全相同，且无注释说明未来差异化意图。
- **复核状态**: 未复核

### [维度04-05] tabStore 持久化不区分用户身份，跨会话保留前一个用户的标签页

- **文件**: `apps/main/src/store/tabStore.ts:58-62`
- **证据片段**:
  ```ts
  persist(
    (set) => ({
      tabs: [homeTab],
      activePath: homeTab.path,
    }),
    {
      name: 'tabs:v1',
      storage: createJSONStorage(() => localStorage),
    },
  )
  ```
- **严重程度**: P3
- **现状**: tabStore 使用 localStorage 持久化，key `'tabs:v1'` 不包含用户标识。用户 A 登录后的标签页在用户 B 登录后依然存在。
- **风险**: 共享设备场景下，用户 B 看到用户 A 的标签页路径。
- **建议**: 在 logout action 中清空 tabStore。
- **双状态详情**: 不涉及双状态。是持久化策略的跨用户隔离缺失。
- **同步失败症状**: 用户 B 登录时看到标签栏中残留用户 A 打开的页面标签。
- **误报排除**: 标签页包含路径和标题信息，在共享设备场景下构成信息泄露。
- **复核状态**: 未复核

### [维度04-06] layoutStore 的 workspaceFullscreen 与浏览器全屏状态存在时序窗口不一致

- **文件**: `apps/main/src/router/AppShell.tsx:99-131`
- **证据片段**:
  ```ts
  setWorkspaceFullscreen(true);  // ← 立即更新 store
  if (document.fullscreenEnabled && typeof shellElement.requestFullscreen === 'function') {
    try { await shellElement.requestFullscreen(); }
    catch { return; }            // ← 失败时 store 状态不同步回来
  }
  ```
- **严重程度**: P3
- **现状**: `requestFullscreen` 前先将 store 设为 `true`。失败时 catch 块直接 return，store 保持 `workspaceFullscreen: true` 但浏览器实际未进入全屏。
- **风险**: UI 显示全屏状态指示但浏览器未全屏。用户需点击两次才能再次尝试。
- **建议**: 在 catch 块中增加 `setWorkspaceFullscreen(false)` 回滚。
- **双状态详情**: `layoutStore.workspaceFullscreen` 与 `document.fullscreenElement === shellRef.current` 在失败场景下不一致。
- **同步失败症状**: UI 全屏图标显示为已全屏状态但浏览器未全屏。
- **误报排除**: `workspaceFullscreen` 不在 partialize 中，不跨页面加载持久化。但当前会话中确实存在问题。
- **复核状态**: 未复核

### [维度04-07] PluginBridge subscribe 在三个 store 上注册独立 listener，任一 store 变化都触发全量快照重计算

- **文件**: `apps/main/src/App.tsx:93-106`
- **证据片段**:
  ```ts
  subscribe: (listener: () => void) => {
    const handleLanguageChange = () => listener();
    i18n.on?.('languageChanged', handleLanguageChange);
    const unsubscribeTheme = useThemeStore.subscribe(listener);
    const unsubscribeAuth = useAuthStore.subscribe(listener);
    const unsubscribePlugins = usePluginStore.subscribe(listener);
    return () => {
      i18n.off?.('languageChanged', handleLanguageChange);
      unsubscribeTheme();
      unsubscribeAuth();
      unsubscribePlugins();
    };
  },
  ```
- **严重程度**: P3
- **现状**: bridge 的 subscribe 将同一个 listener 注册到三个 store 和 i18n。任何 store 的任何字段变化都触发 listener。
- **风险**: 远程插件组件不必要的 re-render。
- **建议**: 为每个 store 添加 selector 过滤，仅在实际关心的字段变化时通知。
- **双状态详情**: 不涉及双状态。是 bridge 快照重计算粒度问题。
- **同步失败症状**: 无功能性问题，仅有性能影响。
- **误报排除**: bridge 快照只关心 store 的子集，当前全量 subscribe 是过度灵敏。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度04-08] Login/Bootstrap 未同步 tokenManager 存储 → 首次认证请求冗余 401

- **文件**: `apps/main/src/services/http.ts:38-96` + `packages/shared/src/auth/tokenManager.ts:100-194` + `apps/main/src/pages/auth/login/index.tsx:61-62`
- **证据片段**:
  ```ts
  // login/index.tsx:61-62 — 仅写入 authStore
  authStore.login(payload);
  // tokenManager 的存储 (auth:tokens:v1) 未被更新

  // http.ts — 首次请求走 tokenManager.getAccessToken()，返回 undefined
  // 服务端返回 401 → 触发刷新流程 → 才同步两套存储
  ```
- **严重程度**: P2
- **现状**: 系统中存在两套独立的 token 存储：authStore（Zustand persist，key `auth:v2`）和 tokenManager（`auth:tokens:v1`）。Login 和 bootstrap 仅写入 authStore，tokenManager 存储不被更新。首次认证请求冗余 401。
- **风险**: 生产模式下首次请求增加至少 2 次额外网络往返。
- **建议**: 在 login() 和 setSession() 中增加对 tokenManager.setTokens() 的调用。
- **双状态详情**: authStore.token/tokens 与 tokenManager 存储表达同一概念。
- **同步失败症状**: 登录后首次 API 请求出现短暂的加载延迟。
- **误报排除**: 两套存储确实表达同一认证状态，且 tokenManager 在 login 流程中被遗漏。
- **复核状态**: 未复核

### [维度04-09] authStore `token` 与 `tokens.accessToken` 冗余且 `setToken()` 可导致不一致

- **文件**: `apps/main/src/store/authStore.ts:31-36,73-97`
- **证据片段**:
  ```ts
  token: string | undefined;
  tokens: AuthTokens | undefined;

  setToken: (token: string) =>
    set((state) => ({
      token,
      tokens: state.tokens
        ? { ...state.tokens, accessToken: token }
        : undefined, // ← tokens 为 undefined，不一致状态
    })),
  ```
- **严重程度**: P3
- **现状**: authStore 同时维护 `token` 和 `tokens.accessToken`。`setToken()` 在 `tokens` 为 undefined 时仅更新 `token` 不创建 `tokens` 对象。
- **风险**: 依赖 `tokens?.accessToken` 的代码可能读到过时数据。
- **建议**: setToken() 应在 tokens 为 undefined 时创建 tokens 对象。中长期统一使用 tokens.accessToken。
- **双状态详情**: token 和 tokens.accessToken 表达同一 access token。
- **同步失败症状**: clearTokens() 后 setToken() 导致 token 有值而 tokens 为 undefined。
- **误报排除**: setToken() 有真实的不一致路径。
- **复核状态**: 未复核

### [维度04-10] Token 刷新双重去重单例，并发场景理论可触发双刷新

- **文件**: `packages/shared/src/auth/tokenManager.ts:100` + `packages/shared/src/http/client.ts:117`
- **证据片段**:
  ```ts
  // tokenManager.ts:100
  let refreshPromise: Promise<string> | null = null;
  // client.ts:117
  let refreshPromise: Promise<string> | null = null;
  ```
- **严重程度**: P3
- **现状**: token 刷新去重分散在两个独立单例中。极端并发场景下可能发出 2 次刷新请求。
- **风险**: 可能导致服务端 rate-limit。
- **建议**: 统一去重策略。
- **双状态详情**: 不涉及双状态。
- **同步失败症状**: 日常使用中概率极低。
- **误报排除**: 两层 refreshPromise 变量确实独立。
- **复核状态**: 未复核
