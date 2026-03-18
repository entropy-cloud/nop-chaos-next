# Contribution Generator

> 本文档说明如何使用仓库内置脚手架生成一个新的 contribution 项目，并把它接到主应用联调命令里。

---

## 1. 生成命令

在仓库根目录执行：

```bash
pnpm generate:contribution sales-ops-demo
```

其中 `sales-ops-demo` 是你要生成的 contribution 名称。

也可以显式指定端口：

```bash
pnpm generate:contribution sales-ops-demo 4190
```

第二个参数用于设置该 contribution 的默认 dev / preview 端口，同时写入主应用联调 env。

生成后会创建：

- `examples/sales-ops-demo`
- 根脚本 `dev:sales-ops-demo`
- 根脚本 `dev:sales-ops-demo:host`
- 根脚本 `dev:main:sales-ops-demo`
- 主应用脚本 `apps/main/package.json` 中的 `dev:sales-ops-demo`
- 主应用联调环境文件 `apps/main/.env.sales-ops-demo`

如果目标目录或主应用 env 文件已存在，生成器会直接报出清晰错误，不会覆盖现有内容。

---

## 2. 生成内容

脚手架会提供一套可直接运行的 contribution 基础结构：

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `index.html`
- `src/index.ts`
- `src/pages/*`
- `src/standalone/main.tsx`
- `src/theme.css`
- `src/shell.css`
- `src/component-page.css`
- `README.md`

默认是一个最小可运行的 builtin page contribution。

---

## 3. 日常开发命令

以 `sales-ops-demo` 为例：

### 3.1 独立开发

```bash
pnpm dev:sales-ops-demo
```

用途：

- 本地开发页面
- 调样式
- 调独立交互

### 3.2 host mode

```bash
pnpm dev:sales-ops-demo:host
```

用途：

- 以宿主共享运行时方式提供远程入口
- 验证 React / UI / Router / bridge 共享边界

### 3.3 主应用联调

```bash
pnpm dev:main:sales-ops-demo
```

用途：

- 启动主应用并自动使用 `apps/main/.env.sales-ops-demo`
- 自动接入刚生成的 contribution 远程入口和资源源站配置

推荐双终端联调：

```bash
pnpm dev:sales-ops-demo:host
pnpm dev:main:sales-ops-demo
```

---

## 4. 生成后通常要改什么

生成器提供的是骨架，不是最终业务实现。通常需要继续调整：

- `src/index.ts`
  - contribution id
  - theme / styles / menus / builtinPages
  - i18n resources
- `src/pages/*`
  - 替换成真实页面
- `src/standalone/main.tsx`
  - 替换独立调试入口文案或包壳
- `src/theme.css`
- `src/shell.css`
- `src/component-page.css`
- `README.md`

---

## 5. 命名约定

输入名称会被标准化成 slug：

- 输入：`Sales Ops Demo`
- 输出目录：`examples/sales-ops-demo`
- 包名：`@nop-chaos/example-sales-ops-demo`
- 主应用联调命令：`pnpm dev:main:sales-ops-demo`

建议直接使用小写短横线命名。
