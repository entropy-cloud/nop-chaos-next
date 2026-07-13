import React from 'react';
import { RendererProps, resolveVariableAndFilter } from 'amis-core';
import { getVueRenderComponent } from './registry';

const PURE_VARIABLE_PATTERN = /^\$\{[\s\S]+\}$/;

function resolveDynamicValue(value: unknown, data: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  let expr = value;

  if (/^\$[a-zA-Z_]/.test(expr) && !expr.includes('{')) {
    expr = `\${${expr.slice(1)}}`;
  }

  if (!PURE_VARIABLE_PATTERN.test(expr)) {
    return value;
  }

  return resolveVariableAndFilter(expr, data as object | undefined, '| raw');
}

function resolveInnerProps(
  raw: Record<string, unknown> | undefined,
  data: unknown,
): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  const next: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    next[key] = resolveDynamicValue(raw[key], data);
  }

  return next;
}

export interface VueRendererControlProps extends RendererProps {
  vueComponent?: string;
  props?: Record<string, unknown>;
}

export class VueRendererControl extends React.Component<VueRendererControlProps> {
  render() {
    const { vueComponent, data, props: rawProps } = this.props;
    const Component = getVueRenderComponent(vueComponent);

    if (!Component) {
      return (
        <div className="nop-vue-renderer-missing rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          未注册的 vue-renderer 组件: <code>{vueComponent ?? '(空)'}</code>
        </div>
      );
    }

    const resolvedProps = resolveInnerProps(rawProps, data);

    return <Component {...resolvedProps} />;
  }
}
