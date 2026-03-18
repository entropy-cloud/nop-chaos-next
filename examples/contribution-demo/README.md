# Contribution Demo

这个示例项目用于模拟“独立业务仓库输出一个 ESM contribution 给宿主加载”的最小场景。

## 提供能力

- 注册新语言 `fr-FR`
- 注册新主题 `harbor`
- 注册一份额外 shell 样式 `shell.css`
- 注册一个 builtin component 页面 `Contribution Harbor Page`
- 页面样式通过独立 `component-page.css` 演示 Tailwind 共享编译
- 注册 `settings.*` 相关 i18n 文案

## 本地开发

启动示例项目：

```bash
pnpm --filter @nop-chaos/example-contribution-demo dev
```

默认地址：`http://127.0.0.1:4180`

Contribution 入口：

```text
http://127.0.0.1:4180/src/index.ts
```

## 接入宿主

在宿主页面注入：

```html
<script>
  window.__NOP_CONTRIBUTIONS__ = [
    {
      id: 'example-contribution-demo',
      entry: 'http://127.0.0.1:4180/src/index.ts'
    }
  ]
</script>
```

然后启动宿主：

```bash
pnpm --filter @nop-chaos/main dev
```

进入宿主后可验证：

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
examples/contribution-demo/dist/contribution-demo.js
```

生产环境可把 `entry` 改成构建产物 URL，例如：

```html
<script>
  window.__NOP_CONTRIBUTIONS__ = [
    {
      id: 'example-contribution-demo',
      entry: 'https://cdn.example.com/contribution-demo.js'
    }
  ]
</script>
```
