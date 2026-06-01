# Extension Demo

这个示例项目用于模拟“独立业务仓库输出一个 ESM extension 给宿主加载”的最小场景。

## 提供能力

- 注册新语言 `fr-FR`
- 注册新主题 `harbor`
- 定制宿主品牌 logo、标题和浏览器标题
- 用 extension 自己的 React 页面完整替换登录页
- 用 extension 自己的 React 页面完整替换 404 页
- 注册一份额外 shell 样式 `shell.css`
- 注册一个 builtin component 页面 `Extension Harbor Page`，并把入口加入左下角用户菜单
- 页面样式通过独立 `component-page.css` 演示 Tailwind 共享编译
- 注册 `settings.*` 相关 i18n 文案

## 本地开发

### 独立开发模式

启动示例项目：

```bash
pnpm --filter @nop-chaos/example-extension-demo dev
```

默认地址：`http://127.0.0.1:4180`

该模式使用独立入口：

```text
http://127.0.0.1:4180/
```

适合页面和样式调试，不用于验证宿主共享运行时。

### 宿主联调模式

直接启动：

```bash
pnpm dev:extensions
```

说明：

- `dev:extensions` 会自动加载 `apps/main/.env.extension-demo`
- 当前默认使用 `VITE_DEMO_EXTENSION_ALIAS_PATH=../../examples/extension-demo/src/index.ts`，宿主会直接引入 extension 源码
- 该模式默认开启 `VITE_ENABLE_MOCK=true`，避免联调时依赖后端 8080 服务
- 修改 `examples/extension-demo/src/*` 后，宿主页面会立即热更新或自动刷新
- 真正联调入口是宿主地址，不是 extension 自己的 standalone 首页

### 外部目录 alias 模式

如果目标是把 extension-demo 整体放到另一个仓库，也可以让 `apps/main` 直接引入外部 extension 源码入口。

在 `apps/main` 下新增一个 env 文件，例如：

```env
VITE_ENABLE_MOCK=true
VITE_DEMO_EXTENSION_ALIAS_PATH=../external-extension/src/index.ts
```

然后直接启动：

```bash
pnpm dev:extensions
```

说明：

- 宿主会把 `@demo-extension` alias 到 `VITE_DEMO_EXTENSION_ALIAS_PATH`
- 更适合跨仓日常开发，因为 extension 代码不必放回 monorepo
- 该模式会把 extension 纳入宿主的 Vite 构建图，所以更像源码依赖，而不是远程动态加载

进入宿主后可验证：

- 左侧品牌区和登录页品牌区显示 Harbor logo 与标题
- 浏览器标题变为 `Harbor Operations Suite`
- `/auth/login` 显示 Harbor 自定义整页登录界面，而不是宿主默认登录页
- 访问不存在的路由时，`/404` 显示 Harbor 自定义整页 404 页面
- 语言切换中出现 `fr-FR`
- 主题设置中出现 `harbor`
- 左下角用户菜单中出现 `Extension Harbor Page`；左侧主导航仍以后端菜单配置为准
- 页面使用 extension 自己编译的 Tailwind 增量 CSS，同时复用宿主 token 和 `@nop-chaos/ui/base.css`

## 生产构建

```bash
pnpm --filter @nop-chaos/example-extension-demo build
```
