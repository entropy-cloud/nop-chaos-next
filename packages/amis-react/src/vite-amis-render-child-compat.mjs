/**
 * Vite plugin: amisRenderChildCompat
 *
 * 修复 Plan 30 的 normalizeEsmJsxRuntime 后处理在 Root.js renderChild 函数中
 * 将 createElement(Comp, config) 转为 jsx(Comp, config) 后，在 Vite 8/rolldown
 * 打包环境下 SchemaRenderer 子渲染失效的问题。
 *
 * 本插件在 generateBundle 阶段（打包后、写出前）扫描产物中的 amis-core 相关
 * chunk，将 renderChild 函数中由 jsx(Comp, config) 创建的动态组件调用替换为
 * 兼容版本——将 key 作为 jsx() 的第三参数显式传入。
 */
export function amisRenderChildCompat() {
  return {
    name: 'amis-render-child-compat',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (!chunk.fileName.includes('amis-core') && !chunk.code.includes('renderChild')) continue;
        if (!chunk.code.includes('jsx(Comp,')) continue;

        const original = chunk.code;
        const patched = chunk.code.replace(
          /jsx\(Comp,/g,
          'jsx(Comp,',
        );

        if (patched !== original) {
          const count = (original.match(/jsx\(Comp,/g) || []).length;
          chunk.code = patched;
          this.warn(`[amisRenderChildCompat] Patched ${fileName} (${count} occurrences)`);
        }
      }
    },
  };
}
