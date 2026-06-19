import type { ShellExtension, MenuResponse } from '@nop-chaos/shared';

const MENU_URL = '/api/prototype/menu.json';

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

  const userMenuItems = (menuResponse?.items ?? []).map((item) => ({
    id: `flux-proto-${item.id}`,
    title: item.title,
    path: item.path,
    icon: item.icon,
    pageType: 'flux' as const,
    schemaPath: `/api/prototype/pages/${item.schemaPath?.replace(/^\.\//, '') ?? ''}`,
    sort: item.sort ?? 500,
  }));

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
