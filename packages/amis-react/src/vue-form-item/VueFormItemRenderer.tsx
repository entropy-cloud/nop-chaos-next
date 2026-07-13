import type { ComponentType } from 'react';
import { resolveVariableAndFilter, type FormControlProps } from 'amis-core';
import { getVueFormItemComponent } from './registry';

const PURE_VARIABLE_PATTERN = /^\$\{[\s\S]+\}$/;

export interface VueFormItemControlProps extends FormControlProps {
  vueComponent?: string;
  props?: Record<string, unknown>;
}

function resolveDynamicValue(value: unknown, data: unknown): unknown {
  if (typeof value !== 'string' || !PURE_VARIABLE_PATTERN.test(value)) {
    return value;
  }

  return resolveVariableAndFilter(value, data as object | undefined, '| raw');
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

export function VueFormItemControl(props: VueFormItemControlProps) {
  const { vueComponent, data, value, onChange, dispatchEvent, props: rawProps } = props;
  const Component = getVueFormItemComponent(vueComponent);

  if (!Component) {
    return (
      <div className="nop-vue-form-item-missing rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        未注册的 vue-form-item 组件: <code>{vueComponent ?? '(空)'}</code>
      </div>
    );
  }

  const resolvedProps = resolveInnerProps(rawProps as Record<string, unknown> | undefined, data);

  const handleValueChange = async (next: unknown) => {
    const dispatcher = dispatchEvent as
      | ((type: string, eventData: Record<string, unknown>) => Promise<{ prevented?: boolean }>)
      | undefined;

    if (typeof dispatcher === 'function') {
      const baseData = (data as Record<string, unknown> | null) ?? {};
      const event = await dispatcher('change', { ...baseData, value: next });

      if (event?.prevented) {
        return;
      }
    }

    onChange?.(next);
  };

  const RenderedComponent = Component as ComponentType<Record<string, unknown>>;

  return (
    <RenderedComponent {...resolvedProps} value={value} onValueChange={handleValueChange} />
  );
}
