import {
  fetchAmisRequest,
  getAmisRuntimeAdapter,
  type AmisPageObject,
  type AmisRequestOptions,
} from '@nop-chaos/amis-core';

function normalizeMessage(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return 'Unknown amis runtime message';
}

export function createAmisEnv(page: AmisPageObject) {
  const adapter = getAmisRuntimeAdapter();

  return {
    session: page.id,
    fetcher: (options: AmisRequestOptions) => fetchAmisRequest({ ...options, _page: page }),
    jumpTo: (to: string) => {
      adapter.navigate(to);
    },
    updateLocation: (to: string, replace?: boolean) => {
      adapter.navigate(to, { replace: Boolean(replace) });
    },
    isCurrentUrl: (to: string) => adapter.isCurrentUrl(to),
    notify: (type: 'info' | 'success' | 'error' | 'warning', message: unknown) => {
      adapter.notify(type, normalizeMessage(message));
    },
    alert: (message: string, title?: string) => adapter.alert(message, title),
    confirm: (message: string, title?: string) => adapter.confirm(message, title),
    copy: async (content: string) => {
      await navigator.clipboard.writeText(content);
      adapter.notify('success', 'Copied to clipboard');
      return true;
    },
    _page: page,
  };
}
