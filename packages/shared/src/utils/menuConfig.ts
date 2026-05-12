import type { MenuItem, MenuResponse } from '../types/menu';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid menu config: '${fieldPath}' must be a non-empty string`);
  }

  return value;
}

function assertOptionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid menu config: '${fieldPath}' must be a string`);
  }

  return value;
}

function assertOptionalBoolean(value: unknown, fieldPath: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid menu config: '${fieldPath}' must be a boolean`);
  }

  return value;
}

function assertOptionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid menu config: '${fieldPath}' must be a number`);
  }

  return value;
}

function assertOptionalStringArray(value: unknown, fieldPath: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid menu config: '${fieldPath}' must be an array of strings`);
  }

  return value;
}

function assertPageType(value: unknown, fieldPath: string): MenuItem['pageType'] {
  if (
    value === 'builtin' ||
    value === 'plugin' ||
    value === 'amis' ||
    value === 'iframe' ||
    value === 'external'
  ) {
    return value;
  }

  throw new Error(
    `Invalid menu config: '${fieldPath}' must be 'builtin', 'plugin', 'amis', 'iframe', or 'external'`,
  );
}

function validateMenuItem(value: unknown, fieldPath: string): MenuItem {
  if (!isRecord(value)) {
    throw new Error(`Invalid menu config: '${fieldPath}' must be an object`);
  }

  const id = assertString(value.id, `${fieldPath}.id`);
  const title = assertOptionalString(value.title, `${fieldPath}.title`);
  const titleKey = assertOptionalString(value.titleKey, `${fieldPath}.titleKey`);
  const path = assertString(value.path, `${fieldPath}.path`);
  const pageType = assertPageType(value.pageType, `${fieldPath}.pageType`);
  const componentId = assertOptionalString(value.componentId, `${fieldPath}.componentId`);
  const pluginUrl = assertOptionalString(value.pluginUrl, `${fieldPath}.pluginUrl`);
  const schemaPath = assertOptionalString(value.schemaPath, `${fieldPath}.schemaPath`);
  const frameSrc = assertOptionalString(value.frameSrc, `${fieldPath}.frameSrc`);
  const externalUrl = assertOptionalString(value.externalUrl, `${fieldPath}.externalUrl`);
  const badge = assertOptionalString(value.badge, `${fieldPath}.badge`);
  const sort = assertOptionalNumber(value.sort, `${fieldPath}.sort`);
  const hideInMenu = assertOptionalBoolean(value.hideInMenu, `${fieldPath}.hideInMenu`);
  const roles = assertOptionalStringArray(value.roles, `${fieldPath}.roles`);

  const icon = assertOptionalString(value.icon, `${fieldPath}.icon`);

  if (!title && !titleKey) {
    throw new Error(`Invalid menu config: '${fieldPath}' must define 'title' or 'titleKey'`);
  }

  if (pageType === 'plugin' && !pluginUrl) {
    throw new Error(`Invalid menu config: '${fieldPath}.pluginUrl' is required for plugin pages`);
  }

  if (pageType === 'builtin' && !componentId) {
    throw new Error(
      `Invalid menu config: '${fieldPath}.componentId' is required for builtin pages`,
    );
  }

  if (pageType === 'amis' && !schemaPath) {
    throw new Error(`Invalid menu config: '${fieldPath}.schemaPath' is required for amis pages`);
  }

  if (pageType === 'iframe' && !frameSrc) {
    throw new Error(`Invalid menu config: '${fieldPath}.frameSrc' is required for iframe pages`);
  }

  if (pageType === 'external' && !externalUrl) {
    throw new Error(
      `Invalid menu config: '${fieldPath}.externalUrl' is required for external pages`,
    );
  }

  const children =
    value.children === undefined
      ? undefined
      : validateMenuItems(value.children, `${fieldPath}.children`);

  return {
    id,
    title,
    titleKey,
    path,
    icon,
    children,
    badge,
    pageType,
    componentId,
    pluginUrl,
    schemaPath,
    frameSrc,
    externalUrl,
    roles,
    sort,
    hideInMenu,
  };
}

function validateMenuItems(value: unknown, fieldPath: string): MenuItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid menu config: '${fieldPath}' must be an array`);
  }

  return value.map((item, index) => validateMenuItem(item, `${fieldPath}[${index}]`));
}

export function validateMenuResponse(value: unknown): MenuResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid menu config: root value must be an object');
  }

  const home = assertOptionalString(value.home, 'home');
  const items = validateMenuItems(value.items, 'items');

  return {
    home,
    items,
  };
}
