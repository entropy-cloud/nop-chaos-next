import type { ShellExtension, MenuResponse, MenuItem } from '@nop-chaos/shared';

const MENU_URL = '/api/prototype/menu.json';

function toSchemaUrl(schemaPath: string | undefined): string {
  const cleaned = schemaPath?.replace(/^\.\//, '') ?? '';
  return `/api/prototype/pages/${cleaned}`;
}

function mapMenuItem(item: MenuItem): MenuItem {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  if (hasChildren) {
    return {
      ...item,
      id: `flux-proto-${item.id}`,
      pageType: 'builtin',
      children: item.children!.map(mapMenuItem),
    };
  }

  return {
    ...item,
    id: `flux-proto-${item.id}`,
    pageType: 'flux',
    schemaPath: toSchemaUrl(item.schemaPath),
  };
}

export async function getExtension(): Promise<ShellExtension> {
  let menuResponse: MenuResponse | null = null;

  try {
    const res = await fetch(MENU_URL);
    if (res.ok) {
      menuResponse = (await res.json()) as MenuResponse;
    }
  } catch {
    // prototype server not available
  }

  const userMenuItems = (menuResponse?.items ?? []).map(mapMenuItem);

  const extension: ShellExtension = {
    id: 'example-flux-prototype',
    order: 90,
    shell: {
      defaultHomePath: menuResponse?.home ?? '/',
    },
    userMenuItems,
  };

  return extension;
}
