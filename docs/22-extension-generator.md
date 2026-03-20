# Extension 生成器

> 本文档说明如何使用脚手架生成新的 extension 项目。

---

## 1. 生成命令

在仓库根目录执行：

```bash
pnpm generate:extension <name> [port]
```

示例：
```bash
pnpm generate:extension harbor-extension
pnpm generate:extension harbor-extension 4190
```

第二个参数为可选端口，默认自动分配。

---

## 2. 生成内容

生成器创建：
- `examples/<name>/` 目录结构
- 根 `package.json` 中的脚本：
  - `dev:<name>` - 独立开发
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

用途：本地页面开发、样式调试。

### 主应用联调

```bash
pnpm dev:main:<name>
```

用途：启动主应用并自动接入 extension。

联调说明：
- `dev:main:<name>` 启动宿主并加载该 extension
- 真正访问的是宿主地址，不是 extension 自己的 standalone 首页
- 当前推荐直接使用本地 alias 模式，让宿主把 extension 当作源码依赖接入
- 若主应用联调不依赖真实后端，给对应 `apps/main/.env.<name>` 加 `VITE_ENABLE_MOCK=true`

如果后续要把 extension 移到外部仓库，也可以让宿主继续走本地 alias 模式：

```env
VITE_ENABLE_MOCK=true
VITE_DEMO_EXTENSION_ALIAS_PATH=../external-extension/src/index.ts
```

此时 `apps/main` 会把 `@demo-extension` 解析到外部目录源码入口，直接把 extension 纳入宿主 Vite 构建图。这个模式更适合日常开发联调。

---

## 4. 命名约定

输入名称会被标准化成 slug：

| 输入 | 输出 |
|------|------|
| `Harbor Extension` | `harbor-extension` |
| `My App` | `my-app` |

- 目录：`examples/harbor-extension`
- 包名： `@nop-chaos/example-harbor-extension`
- 命令： `pnpm dev:harbor-extension`

---

## 5. 生成后需要修改

- `src/index.ts` - extension id、主题、菜单、内置页面
- `src/pages/*` - 替换成真实页面
- `src/standalone/main.tsx` - 独立调试入口
- `src/theme.css` / `src/shell.css` / `src/component-page.css` - 样式文件
- `README.md` - 项目说明
