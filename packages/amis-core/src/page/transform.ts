import { getAmisRuntimeAdapter } from '../adapter';
import type { AmisSchemaRecord } from '../types';
import { processSchemaValue } from './processor';
import { resolveXuiComponent } from './registry';

function normalizeRoles(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function addClassName(value: AmisSchemaRecord, key: string, className: string): void {
  const existing = value[key];

  if (typeof existing === 'string') {
    if (!existing.includes(className)) {
      value[key] = `${className} ${existing}`;
    }
  } else {
    value[key] = className;
  }
}

function addDialogDrawerClass(value: AmisSchemaRecord): void {
  if (value.type === 'dialog' || value.type === 'modal') {
    addClassName(value, 'className', 'amis');
    addClassName(value, 'bodyClassName', 'amis');
  } else if (value.type === 'drawer') {
    addClassName(value, 'className', 'amis');
  }
}

export async function transformPageJson(schema: unknown) {
  const adapter = getAmisRuntimeAdapter();

  return processSchemaValue(schema, {
    onObject: async (value: AmisSchemaRecord) => {
      const roles = normalizeRoles(value['xui:roles']);

      if (roles.length > 0 && !roles.some((role) => adapter.hasRole(role))) {
        return null;
      }

      let nextValue = value;

      if ('xui:roles' in nextValue) {
        nextValue = { ...nextValue };
        delete nextValue['xui:roles'];
      }

      const componentType = nextValue['xui:component'];

      if (typeof componentType === 'string' && componentType.length > 0) {
        const transformedValue = await resolveXuiComponent(componentType, nextValue);
        nextValue = { ...transformedValue };
        delete nextValue['xui:component'];
      }

      addDialogDrawerClass(nextValue);

      return nextValue;
    },
  });
}
