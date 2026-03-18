# Contribution 生成器

> 本文档说明如何使用脚手架生成新的 contribution 项目。

---

## 1. 生成命令

在仓库根目录执行：

```bash
pnpm generate:contribution <name> [port]
```

示例：
```bash
pnpm generate:contribution sales-ops-demo
pnpm generate:contribution sales-ops-demo 4190
```

第二个参数为可选端口，默认自动分配。

---

## 2. 生成内容

生成器创建：
- `examples/<name>/` 目录结构
- 根 `package.json` 中的脚本：
  - `dev:<name>` - 独立开发
  - `dev:<name>:host` - host 模式
  - `dev:main:<name>` - 主应用联调

生成目录结构：
```text
examples/<name>/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── src/
│   ├── index.ts
│   ├── pages/
│   ├── standalone/main.tsx
│   ├── theme.css
│   ├── shell.css
│   └── component-page.css
└── README.md
```

---

## 3. 开发命令

### 独立开发

```bash
pnpm dev:<name>
```

用途：本地页面开发、样式调试

### Host 模式

```bash
pnpm dev:<name>:host
```

用途：以宿主共享运行时方式提供远程入口

### 主应用联调

```bash
pnpm dev:main:<name>
```

用途：启动主应用并自动接入 contribution

推荐双终端：
```bash
# 终端 1
pnpm dev:<name>:host

# 终端 2
pnpm dev:main:<name>
```

---

## 4. 命名约定

输入名称会被标准化成 slug：

| 输入 | 输出 |
|------|------|
| `Sales Ops Demo` | `sales-ops-demo` |
| `My App` | `my-app` |

- 目录：`examples/sales-ops-demo`
- 包名： `@nop-chaos/example-sales-ops-demo`
- 命令： `pnpm dev:sales-ops-demo`

---

## 5. 生成后需要修改

- `src/index.ts` - contribution id、主题、菜单、内置页面
- `src/pages/*` - 替换成真实页面
- `src/standalone/main.tsx` - 独立调试入口
- `src/theme.css` / `src/shell.css` / `src/component-page.css` - 样式文件
- `README.md` - 项目说明
