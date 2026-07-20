import type { FluxApiRequest, FluxApiRequestContext, FluxRendererEnv } from '@nop-chaos/flux';
import { applyPageTransformers } from '@nop-chaos/extension-host';
import { toast } from '@nop-chaos/ui';
import i18n from '../config/i18n';
import { normalizeLanguageCode } from '../config/i18n/languages';
import { confirmInApp } from '../services/confirm';
import { mainHttpClient } from '../services/http';
import { withPageCache, withDictCache } from './cache';
import { fetchFluxPage, fetchFluxDict } from './providers';

interface CreateMainFluxEnvOptions {
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
}

type FluxNotifyLevel = 'info' | 'success' | 'warning' | 'error';

export function createMainFluxEnv({ navigate }: CreateMainFluxEnvOptions): FluxRendererEnv {
  return {
    fetcher: async <T,>(api: FluxApiRequest, ctx: FluxApiRequestContext) => {
      const response = await mainHttpClient.request<T>({
        url: api.url,
        method: api.method ?? 'GET',
        data: api.data,
        headers: api.headers,
        signal: ctx.signal,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        data: response.data,
        headers: response.headers,
        raw: response,
      };
    },
    notify: (level: FluxNotifyLevel, message: string) => {
      if (level === 'success') {
        toast.success(message);
        return;
      }

      if (level === 'error') {
        toast.error(message);
        return;
      }

      if (level === 'warning') {
        toast.warning(message);
        return;
      }

      toast(message);
    },
    navigate,
    confirm: async (message: string) => confirmInApp(message),
    locale: normalizeLanguageCode(i18n.language),
    loadPage: (path: string, signal?: AbortSignal) =>
      withPageCache(normalizeLanguageCode(i18n.language), path, () =>
        fetchFluxPage(path, signal).then((schema) =>
          applyPageTransformers(schema, { schemaPath: path, pageType: 'flux' }),
        ),
      ),
    loadDict: (name: string, signal?: AbortSignal) =>
      withDictCache(normalizeLanguageCode(i18n.language), name, () => fetchFluxDict(name, signal)),
  };
}
