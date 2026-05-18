import type { FluxApiRequest, FluxApiRequestContext, FluxRendererEnv } from '@nop-chaos/flux';
import { toast } from '@nop-chaos/ui';
import { confirmInApp } from '../services/confirm';
import { mainHttpClient } from '../services/http';

interface CreateMainFluxEnvOptions {
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
}

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
    notify: (level, message) => {
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
    confirm: async (message) => confirmInApp(message),
  };
}
