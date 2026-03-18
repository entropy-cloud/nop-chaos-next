# Contribution Demo

这个示例项目用于模拟“独立业务仓库输出一个 ESM contribution 给宿主加载”的最小场景。

## 提供能力

- 注册新语言 `fr-FR`
- 注册新主题 `harbor`
- 定制宿主品牌 logo、标题和浏览器标题
- 用 contribution 自己的 React 页面完整替换登录页
- 用 contribution 自己的 React 页面完整替换 404 页
- 注册一份额外 shell 样式 `shell.css`
- 注册一个 builtin component 页面 `Contribution Harbor Page`
- 页面样式通过独立 `component-page.css` 演示 Tailwind 共享编译
- 注册 `settings.*` 相关 i18n 文案

## 本地开发

### 独立开发模式

启动示例项目：

```bash
pnpm dev:contribution-demo
```

默认地址：`http://127.0.0.1:4180`

该模式使用独立入口：

```text
http://127.0.0.1:4180/
```

适合页面和样式调试，不用于验证宿主共享运行时。

### 宿主联调模式

启动 host mode 开发服务：

```bash
pnpm dev:contribution-demo:host
```

默认远程入口：

```text
http://127.0.0.1:4180/src/index.ts
```

该模式下 `react` 和 `react/jsx-runtime` 会指向宿主提供的固定 shared shim。

## 接入宿主

启动宿主：

```bash
pnpm dev:main:contribution-demo
```

推荐同时开两个终端：

```bash
pnpm dev:contribution-demo:host
pnpm dev:main:contribution-demo
```

说明：

- `dev:main:contribution-demo` 会自动加载 `apps/main/.env.contribution-demo`
- 该 env 文件已经包含 contribution 远程入口和资源源站地址
- `__NOP_HOST_ORIGIN__` 用于让 contribution 里的样式资源仍然从 contribution dev server 获取
- 宿主共享运行时 shim 仍然来自主应用的 `http://127.0.0.1:4173/nop-shared/*`

进入宿主后可验证：

- 左侧品牌区和登录页品牌区显示 Harbor logo 与标题
- 浏览器标题变为 `Harbor Operations Suite`
- `/auth/login` 显示 Harbor 自定义整页登录界面，而不是宿主默认登录页
- 访问不存在的路由时，`/404` 显示 Harbor 自定义整页 404 页面
- 语言切换中出现 `fr-FR`
- 主题设置中出现 `harbor`
- 菜单中出现 `Contribution Harbor Page`
- 页面使用 contribution 自己编译的 Tailwind 增量 CSS，同时复用宿主 token 和 `@nop-chaos/ui/base.css`

## 生产构建

```bash
pnpm --filter @nop-chaos/example-contribution-demo build
```

构建产物：

```text
examples/contribution-demo/dist/contribution-demo.host.js
```

生产环境可把 `entry` 改成构建产物 URL，例如：

```html
<script>
  window.__NOP_CONTRIBUTIONS__ = [
    {
      id: 'example-contribution-demo',
      entry: 'https://cdn.example.com/contribution-demo.host.js'
    }
  ]
</script>
```
