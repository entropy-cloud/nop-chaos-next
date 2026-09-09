/**
 * Vite plugin: fixAmisRenderChild
 *
 * Plan 30 的 normalizeEsmJsxRuntime 把 amis-core/esm/Root.js 中 renderChild 函数的
 * createElement(Comp, props) 转成了 jsx(Comp, props)。
 *
 * jsx() 和 createElement() 在无显式 children 参数时应该等价，但 React 19 的
 * jsx-runtime 在开发模式下对 jsx() 创建的元素做了 props 冻结等额外处理，
 * 导致 SchemaRenderer 通过 renderChild 递归渲染子 schema 时 children 丢失。
 *
 * 本插件在 Vite serve/build 时拦截 amis-core 的 Root.js，把 renderChild 函数体中
 * 对 jsx() 的调用替换为一个兼容包装函数 _amisCreateElementCompat，内部使用
 * React.createElement 语义创建元素，同时保持 jsx-runtime 的 key 提取行为。
 */
import type { Plugin } from 'vite';

const COMPAT_SHIM = `
var _amisReactCompatShim = function _amisReactCompatShim(type, config) {
  var key = config && config.key != null ? '' + config.key : null;
  var props = {};
  if (config) {
    for (var k in config) {
      if (Object.prototype.hasOwnProperty.call(config, k) && k !== 'key') {
        props[k] = config[k];
      }
    }
  }
  return { $$typeof: Symbol.for('react.element'), type: type, key: key, ref: null, props: props, _owner: null };
};
`;

export function fixAmisRenderChild(): Plugin {
  return {
    name: 'fix-amis-render-child',
    enforce: 'pre',
    transform(code, id) {
      // Only intercept amis-core's Root.js ESM module
      if (!id.includes('amis-core') || !id.includes('Root')) {
        return null;
      }

      // Check if this file has the renderChild function with jsx(Comp,
      if (!code.includes('jsx(Comp,')) {
        return null;
      }

      // Replace jsx(Comp, with compat shim
      let patched = code;

      // Add the shim after the imports
      patched = patched.replace(
        /(import[^;]+;\s*)/,
        `$1\n${COMPAT_SHIM}\n`,
      );

      // Replace the two jsx(Comp, calls in renderChild
      patched = patched.replace(/jsx\(Comp,/g, '_amisReactCompatShim(Comp,');

      console.warn('[fixAmisRenderChild] Patched Root.js renderChild for jsx compatibility');

      return { code: patched, map: null };
    },
  };
}
