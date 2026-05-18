# 维度 11：类型安全与契约质量

## 第 1 轮（初审）

### [维度11-01] extension-host 测试中可消除的 `as any` 断言（3 处 `setShellRuntimeConfig` 调用）

- **文件**: `packages/extension-host/src/index.test.ts:361,374,385`
- **证据片段**:
```typescript
// 行 353-361
  it('setShellRuntimeConfig and getShellRuntimeConfig round-trip', () => {
    const config = {
      branding: { name: 'Test', shortName: 'T', documentTitle: 'Test' },
      loginUi: { features: [{ titleKey: 'a', descriptionKey: 'b' }] },
      shell: { defaultHomePath: '/test' },
      systemPages: { login: 'TestLogin' },
    };

    setShellRuntimeConfig(config as any);
```
```typescript
// 行 368-374
  it('getExtensionDefaultHomePath returns shell defaultHomePath', () => {
    setShellRuntimeConfig({
      branding: { name: 'T', shortName: 'T', documentTitle: 'T' },
      loginUi: { features: [] },
      shell: { defaultHomePath: '/custom-home' },
      systemPages: {},
    } as any);
```
```typescript
// 行 379-385
  it('getSystemPageComponentId returns page component id', () => {
    setShellRuntimeConfig({
      branding: { name: 'T', shortName: 'T', documentTitle: 'T' },
      loginUi: { features: [] },
      shell: {},
      systemPages: { notFound: 'NotFoundPage', serverError: 'ServerErrorPage' },
    } as any);
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: 测试代码中使用 `as any` 将对象字面量传给 `setShellRuntimeConfig(config: ShellRuntimeConfig)`。但这些对象字面量结构上完全满足 `ShellRuntimeConfig` 的所有必填字段。
- **真实风险**: 当前无运行时风险——仅在测试中使用。但 `as any` 绕过了类型检查，如果未来 `ShellRuntimeConfig` 增加必填字段，这些测试不会在编译期报警。
- **建议**: 移除 `as any`，改用 `satisfies ShellRuntimeConfig` 或直接赋值。
- **误报排除**: 这不是合理的动态边界——`ShellRuntimeConfig` 是本包内定义的精确类型，测试数据完全可以满足其结构。
- **复核状态**: 未复核

---

### [维度11-02] http.test.ts 中 `capturedConfig` 和 mock 回调参数使用 `any` 可收敛为 `HttpRuntime`

- **文件**: `apps/main/src/services/http.test.ts:36,47`
- **证据片段**:
```typescript
// 行 34-52
describe('http', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedConfig: any;

  beforeEach(() => {
    useAuthStore.setState({ ... });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateHttpClient.mockImplementation((config: any) => {
      capturedConfig = config;
      return {
        request: vi.fn().mockResolvedValue({ status: 200, data: { data: {} } }),
      };
    });
  });
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: `capturedConfig` 声明为 `any`，用于捕获 `createHttpClient` 收到的 `HttpRuntime` 对象。测试后续访问了 `capturedConfig.getTimeoutMs()`、`capturedConfig.getAuthToken()` 等全部都是 `HttpRuntime` 的已知方法。
- **真实风险**: 当前无运行时风险。但 `any` 绕过了类型检查，如果 `HttpRuntime` 接口发生破坏性变更，测试不会在编译期报错。
- **建议**: 将 `let capturedConfig: any` 改为 `let capturedConfig: HttpRuntime`，mock 回调参数同步改为 `(config: HttpRuntime)`。从 `@nop-chaos/shared` 导入 `HttpRuntime` 类型。
- **误报排除**: 这不是 mock 库返回的动态值——`createHttpClient` 的参数签名是精确的 `HttpRuntime`。
- **复核状态**: 未复核

---

### [维度11-03] httpAjax.test.ts 中 mock 的 `transformGraphQLRequest` 参数使用 `any` 可收敛为 `AmisRequestOptions`

- **文件**: `apps/main/src/services/httpAjax.test.ts:39`
- **证据片段**:
```typescript
// 行 37-56
vi.mock('@nop-chaos/amis-core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformGraphQLRequest: (req: any) => {
    if (req.url.startsWith('@query:') || req.url.startsWith('@mutation:')) {
      // ...
      return {
        operationName: action,
        request: {
          url: '/graphql',
          method: 'POST',
          headers: req.headers,
          data: { query: `{ ${action} }`, variables: req.data },
        },
      };
    }
    return null;
  },
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: mock 中 `transformGraphQLRequest` 的参数声明为 `any`，但函数体内访问了 `req.url`、`req.headers`、`req.data`——这些全部是 `AmisRequestOptions` 接口的已知字段。
- **真实风险**: 当前无运行时风险。但 mock 中的 `any` 参数使 mock 与真实接口脱钩。
- **建议**: 将参数类型改为 `AmisRequestOptions`（从 `@nop-chaos/amis-core` 导入），移除 eslint-disable 注释。
- **误报排除**: `AmisRequestOptions` 是本项目定义的精确类型，mock 可以引用。
- **复核状态**: 未复核

---

### [维度11-04] extension-host 测试中 `home: undefined as any` 可改用可选字段

- **文件**: `packages/extension-host/src/index.test.ts:424`
- **证据片段**:
```typescript
// 行 412-428
  it('sets home from first extension menu when home is undefined', () => {
    setLoadedExtensions([ ... ]);

    const result = mergeExtensionMenus({
      home: undefined as any,
      items: [makeMenuItem({ id: 'orig', path: '/orig', title: 'Orig' })],
    });

    expect(result.home).toBe('/new');
  });
```
- **严重程度**: P3
- **分类**: 可疑
- **现状**: `MenuResponse` 中 `home` 字段类型为 `string | undefined`（可选），传入 `home: undefined as any` 是为了测试 `home` 为 `undefined` 的场景。但 `as any` 是不必要的。
- **真实风险**: 无运行时风险。但 `as any` 是不必要的——可以直接省略 `home` 字段。
- **建议**: 尝试直接写 `home: undefined`（不带 `as any`）或直接省略 `home` 字段。
- **误报排除**: 这不是动态边界——`MenuResponse` 类型是项目自己定义的，`home` 是明确可选的。
- **复核状态**: 未复核

---

### [维度11-05] `MenuItem`、`AuthState`、`ThemeConfig` 等核心共享类型缺少 JSDoc 文档

- **文件**: `packages/shared/src/types/menu.ts:1-18`, `packages/shared/src/types/user.ts:1-30`, `packages/shared/src/types/theme.ts:1-15`, `packages/shared/src/types/plugin.ts:1-20`
- **证据片段**:
```typescript
// packages/shared/src/types/menu.ts — 无任何 JSDoc
export interface MenuItem {
  id: string;
  title?: string;
  titleKey?: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
  badge?: string;
  pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external';
  componentId?: string;
  pluginUrl?: string;
  schemaPath?: string;
  frameSrc?: string;
  externalUrl?: string;
  roles?: string[];
  sort?: number;
  hideInMenu?: boolean;
}

export interface MenuResponse {
  items: MenuItem[];
  home?: string;
}
```
```typescript
// packages/shared/src/types/user.ts — 无任何 JSDoc
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
  tokens?: AuthTokens;
}
```
```typescript
// packages/shared/src/types/theme.ts — 无任何 JSDoc
export interface ThemeConfig {
  themeId: ThemeId;
  displayMode: DisplayMode;
}
```
- **严重程度**: P3
- **分类**: 可疑（公共接口文档化缺失）
- **现状**: `packages/shared/src/types/extension.ts` 中的 `ShellExtension` 有完整的 JSDoc 文档，每个字段都有说明。但同为跨包公共契约的 `MenuItem`、`AuthState`、`ThemeConfig`、`PluginManifest`、`User`、`AppTab` 完全没有 JSDoc。`MenuItem.pageType` 有 6 种联合类型但未解释每种类型的语义和配套字段约束。
- **真实风险**: 不会导致运行时错误，但会增加跨包协作的认知成本。`pageType` 的 6 种取值各自需要哪些配套字段（如 `plugin` 需要 `pluginUrl`、`amis` 需要 `schemaPath`），这些约束只在 `validateMenuResponse` 的运行时校验中体现，类型定义本身没有文档化。
- **建议**: 为 `MenuItem`（尤其是 `pageType` 的 6 种变体及其配套字段约束）、`AuthState`（`isAuthenticated` 的计算逻辑）、`ThemeConfig`、`PluginManifest` 添加 JSDoc。可以考虑为 `pageType` 的不同变体创建辨别联合类型（discriminated union）。
- **误报排除**: 这些不是内部实现类型——它们被导出在 `@nop-chaos/shared` 的公共 API 表面，被至少 3 个包引用。
- **复核状态**: 未复核

---

## any 使用统计（按包分组）

| 包 | 合理 | 可疑 | 危险 | 总计 |
|---|---|---|---|---|
| `packages/shared` | 0 | 0 | 0 | 0 |
| `packages/core` | 0 | 0 | 0 | 0 |
| `packages/ui` | 0 | 0 | 0 | 0 |
| `packages/plugin-bridge` | 0 | 0 | 0 | 0 |
| `packages/extension-host` | 2 | 3 | 0 | 5 |
| `packages/amis-core` | 0 | 0 | 0 | 0 |
| `apps/main` | 0 | 3 | 0 | 3 |
| `examples/plugin-demo` | 0 | 0 | 0 | 0 |
| `flux-lib` | 0 | 0 | 0 | 0 |

## `as unknown as` 多重断言审查

所有 `as unknown as` 断言均为合理用例——第三方库类型桥接、浏览器兼容性、测试夹具、负面测试数据。未发现三重断言链。

## `@ts-expect-error` / `@ts-ignore` 审查

全仓库零使用。ESLint 配置中已启用禁止规则。

## 跨包类型一致性

- MenuItem：在所有使用处保持一致 ✓
- AuthState：定义与使用一致，plugin-bridge 的子集视图是故意的 ✓
- ThemeConfig：在所有使用处完全一致 ✓
