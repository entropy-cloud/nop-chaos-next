# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] 所有公开导出类型缺失 JSDoc 文档

- **文件**: 所有 packages/*/src/index.ts
- **严重程度**: P3
- **现状**: 所有包的公开接口、类型、函数签名均无 JSDoc。消费者在 IDE 中无法看到语义描述。
- **建议**: 至少为每个包核心 3-5 个接口补齐 JSDoc。
- **误报排除**: 跨包公共契约缺乏文档化是真实的可维护性问题。
- **复核状态**: 未复核

### [维度03-02] @nop-chaos/core 公开导出内部映射表 iconRegistry

- **文件**: `packages/core/src/index.ts:9`
- **证据片段**: 导出 iconRegistry（Record<AppIconName, string>）但无外部消费者直接引用
- **严重程度**: P2
- **现状**: 内部数据结构暴露为公共 API，未来变更映射方式会构成破坏性变更。
- **建议**: 从 index.ts 移除 iconRegistry 导出，仅保留 getIconByName/renderIcon/resolveIcon。
- **误报排除**: 搜索确认无外部消费者直接引用。
- **复核状态**: 未复核

### [维度03-03] AmisFetcherResult.headers 可选 vs HttpResponse.headers 必需

- **文件**: `packages/amis-core/src/types.ts:33-37` vs `packages/shared/src/http/types.ts:32-36`
- **严重程度**: P2
- **现状**: amis-core 的 AmisFetcherResult.headers 为可选，shared 的 HttpResponse.headers 为必需。
- **建议**: 统一为必需字段。
- **误报排除**: 网络请求总会返回 headers。
- **复核状态**: 未复核

### [维度03-04] BoundStore<T> 类型签名包含 selector 重载但实际不支持

- **文件**: `packages/plugin-bridge/src/types.ts:21-40`
- **严重程度**: P2
- **现状**: 类型签名暗示 store(selector) 可用，但 App.tsx 的实现仅支持无参调用。
- **建议**: 移除 selector 重载签名。
- **误报排除**: 如果 extension 代码尝试 selector 调用会产生非预期行为。
- **复核状态**: 未复核

### [维度03-05] ShellRuntimeConfig 在 extension-host 独立定义

- **文件**: `packages/extension-host/src/runtime.ts:11-39`
- **严重程度**: P2
- **现状**: 运行时类型未与 shared 包的声明类型建立显式关联。
- **建议**: 移至 shared 或使用 Pick/extends 建立关联。
- **误报排除**: 消费者需要从两个包分别获取类型。
- **复核状态**: 未复核

### [维度03-06] AppIconProps/AppIconComponent 未从 core 的 index.ts 导出

- **文件**: `packages/core/src/utils/iconMap.tsx:6-7`
- **严重程度**: P2
- **现状**: 公开函数的返回类型未导出，消费者无法在类型注解中引用。
- **建议**: 在 index.ts 中添加 type export。
- **误报排除**: 当前消费者直接调用返回的组件不需要类型引用，但存储/传递时需要。
- **复核状态**: 未复核

### [维度03-07] amis-core 重复实现 isAbsoluteUrl

- **文件**: `packages/amis-core/src/core/url.ts:23-25` vs `packages/shared/src/http/url.ts:5-7`
- **严重程度**: P3
- **现状**: amis-core 已依赖 shared 但重新定义了同名函数。
- **建议**: 从 shared 导入。
- **误报排除**: 正则略有差异（大小写修饰符），需确认是否有意。
- **复核状态**: 未复核

### [维度03-08] theme-tokens index.ts 空导出与 exports map 不一致

- **文件**: `packages/theme-tokens/src/index.ts:1`
- **严重程度**: P2
- **现状**: exports map 声明了 "." 入口但 index.ts 为空。消费者无法通过 TS import 获取任何值。
- **建议**: 添加注释说明或导出令牌名常量。
- **误报排除**: CSS-only 包是合法模式，但与其他包惯例不一致。
- **复核状态**: 未复核

### [维度03-09] MenuItem.pageType 6 种值但 core 仅处理 2 种路由

- **文件**: `packages/shared/src/types/menu.ts:9`
- **严重程度**: P2
- **现状**: pageType 枚举有 6 种值，但 core 包的 PluginSlot 仅处理 plugin 类型。
- **建议**: 添加文档说明每种 pageType 的处理策略。
- **误报排除**: amis/flux/iframe/external 由 host app 处理，是合理的架构选择。
- **复核状态**: 未复核

### [维度03-10] App.tsx bridge 构造使用内联类型而非 PluginBridgeNavigateOptions

- **文件**: `apps/main/src/App.tsx:85`
- **严重程度**: P3
- **现状**: navigate 的 options 使用内联类型而非导入的接口类型。
- **建议**: 导入 PluginBridgeNavigateOptions 确保类型同步。
- **误报排除**: 结构一致但不会自动同步未来变更。
- **复核状态**: 未复核

### [维度03-11] XuiComponentTransform 未从 amis-core index.ts 导出

- **文件**: `packages/amis-core/src/page/registry.ts:3-5`
- **严重程度**: P3
- **现状**: registerXuiComponent 的参数类型未导出，消费者无法显式注解。
- **建议**: 在 index.ts 中添加 type export。
- **误报排除**: TypeScript 推断可工作，但显式注解时需要。
- **复核状态**: 未复核
