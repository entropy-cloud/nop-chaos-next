# amis helper.css 与 Tailwind CSS 4 样式冲突说明

## 1. 问题现象

在升级到 Tailwind CSS 4 后，宿主应用里出现了两个典型问题：

- `hidden lg:inline-flex` 在大屏下仍然不显示
- `flex flex-col lg:flex-row` 在大屏下没有切换为横向布局，页面头部内容看起来像“居中”或“堆叠”了

受影响位置包括：

- `apps/main/src/router/AppShell.tsx`
- `apps/main/src/components/common/PageHeader.tsx`

## 2. 根因

问题不是浏览器版本过低，也不是单纯的 Tailwind 4 响应式优先级变化。

排查后确认，当前项目全局引入了 amis 的以下样式：

```ts
import 'amis/lib/themes/cxd.css';
import 'amis/lib/helper.css';
```

文件位置：`apps/main/src/amis/init.ts`

其中 `amis/lib/helper.css` 自带一套全局工具类，并且类名与 Tailwind 的常用 utility 重名，例如：

- `.hidden`
- `.inline-flex`
- `.flex-row`
- `.flex-col`
- `.items-center`
- `.justify-between`

对应定义可在以下文件中看到：

- `node_modules/.pnpm/amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5/node_modules/amis/lib/helper.css:16621`
- `node_modules/.pnpm/amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5/node_modules/amis/lib/helper.css:16663`
- `node_modules/.pnpm/amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5/node_modules/amis/lib/helper.css:24366`
- `node_modules/.pnpm/amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5/node_modules/amis/lib/helper.css:24372`
- `node_modules/.pnpm/amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5/node_modules/amis/lib/helper.css:27327`

这会导致宿主应用和 amis 在全局 class name 上发生污染。

## 3. 为什么升级前不明显，升级后暴露

在 Tailwind CSS 3 下，最终样式生成顺序和现有加载链路没有把问题放大；升级到 Tailwind CSS 4 后，宿主样式与第三方全局工具类的叠加顺序发生变化，导致冲突更容易体现在布局和显示类上。

因此，这次问题本质上是：

- 宿主项目使用 Tailwind utility class
- amis `helper.css` 也定义了同名全局 utility class
- 两者同时存在时，最终命中的规则不再稳定

## 4. 验证过程

项目中只在一个地方引入了 amis CSS：

- `apps/main/src/amis/init.ts:1`
- `apps/main/src/amis/init.ts:2`

将 `helper.css` 暂时注释后：

```ts
import 'amis/lib/themes/cxd.css';
// import 'amis/lib/helper.css'
```

验证结果：

- outline button 恢复正常显示
- `PageHeader` 的大屏布局恢复正常

由此可以确认冲突来源是 `amis/lib/helper.css`，而不是 `cxd.css`。

## 5. 当前处理方式

当前仓库的处理方式：

- 保留 `amis/lib/themes/cxd.css`
- 从未引入 `amis/lib/helper.css`（避免与 Tailwind 工具类冲突）

当前文件：`apps/main/src/amis/init.ts`

## 6. 后续建议

### 6.1 首选方案

继续不在宿主应用中全局引入 `amis/lib/helper.css`。

理由：

- 它和 Tailwind 的工具类命名重叠严重
- 冲突范围是全局的，不只影响 amis 页面
- 对宿主应用的布局类影响最明显

### 6.2 如果未来必须使用 helper.css

可考虑以下方案，但复杂度更高：

- 只在 amis 独立容器或独立入口中加载，避免污染宿主全局样式
- 调整样式加载顺序，但这只能缓解，不能从根本上解决同名 class 问题
- 为宿主 Tailwind 配置统一前缀，例如 `tw-`，彻底隔离 utility class

### 6.3 排查类似问题的方法

当页面出现 `hidden`、`flex-col`、`items-center` 等行为异常时，可优先在 DevTools 中确认：

- 最终命中的规则来自哪个 CSS 文件
- 是否命中了 `amis/lib/helper.css`
- 是否存在与 Tailwind 同名的全局工具类覆盖

## 7. 结论

这次问题的直接根因是 `amis/lib/helper.css` 与 Tailwind CSS 4 在全局工具类命名上发生冲突。

不是 amis 依赖了某个 Tailwind 版本，也不是 Chrome 版本不支持 Tailwind 4 响应式语法。

对当前仓库，最稳妥的做法是：

- 保留 amis 主题样式 `cxd.css`
- 不全局引入 `helper.css`
