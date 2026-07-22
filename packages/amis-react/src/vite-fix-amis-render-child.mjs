/**
 * Vite plugin: fixAmisRenderChild
 *
 * Plan 30 的 normalizeEsmJsxRuntime 后处理插件将 amis-core/esm/Root.js 中
 * renderChild 函数的 createElement(Comp, props) 错误地转为了 jsx(Comp, props)。
 *
 * React 19 的 jsx() (react/jsx-runtime) 与 createElement() 在命令式创建
 * 无 children 元素时存在行为差异：jsx 在 dev 模式下对 props 做 Object.freeze，
 * 且不传递 children 参数，导致 SchemaRenderer 递归子渲染失效。
 *
 * "createElement 被废弃"指的是 classic JSX 编译模式（编译器把 JSX 自动编成
 * createElement），而不是命令式调用 React.createElement() API 本身。
 * React.createElement() 仍然是有效的 public API。
 *
 * 本插件在 Vite serve/build 时拦截 amis-core/esm/Root.js，把 renderChild
 * 函数中的 jsx(Comp, 替换回 React.createElement(Comp,，恢复命令式创建语义。
 */
export function fixAmisRenderChild() {
  return {
    name: 'fix-amis-render-child',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('amis-core') || !id.includes('Root')) {
        return null;
      }
      if (!code.includes('jsx(Comp,')) {
        return null;
      }
      const patched = code.replace(/jsx\(Comp,/g, 'React.createElement(Comp,');
      return { code: patched, map: null };
    },
  };
}
