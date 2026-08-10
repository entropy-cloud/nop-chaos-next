import type { FluxApiRequest, FluxApiRequestContext, FluxRendererEnv } from '@nop-chaos/flux';
import { applyPageTransformers, registerPageTransformer } from '@nop-chaos/extension-host';
import { toast } from '@nop-chaos/ui';
import i18n from '../config/i18n';
import { normalizeLanguageCode } from '../config/i18n/languages';
import { confirmInApp } from '../services/confirm';
import { nopRpcRequest } from '../services/http';
import { withPageCache, withDictCache } from './cache';
import { recordFluxDebug } from './fluxDebug';
import { fetchFluxPage, fetchFluxDict } from './providers';

// ── Schema 兼容性转换 ──

function walkSchema(node: unknown, fn: (obj: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walkSchema(n, fn)); return; }
  const obj = node as Record<string, unknown>;
  fn(obj);
  for (const val of Object.values(obj)) walkSchema(val, fn);
}

// 后端 XPL（GenLayoutTabs）生成 items[i].tab，但 TabsSchema 用 items[i].body，
// 在运行时统一转换，避免改后端 XPL（body 是 XPL 保留字）。
registerPageTransformer({
  id: 'flux:tabs-items-body',
  order: 50,
  transform: (schema) => {
    walkSchema(schema, (node) => {
      if (node.type === 'tabs' && Array.isArray(node.items)) {
        node.items.forEach((item: unknown) => {
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            if ('tab' in o && !('body' in o)) {
              o.body = o.tab;
              delete o.tab;
            }
          }
        });
      }
    });
    return schema;
  },
});

interface CreateMainFluxEnvOptions {
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
}

type FluxNotifyLevel = 'info' | 'success' | 'warning' | 'error';

export function createMainFluxEnv({ navigate }: CreateMainFluxEnvOptions): FluxRendererEnv {
  return {
    // flux dispatch 的 per-fire AbortController 在 cancel-previous（deps 变化/新 dispatch）
    // 时会 abort ctx.signal。flux 自身通过 useCrudLoadAction 的 cancelled flag
    // （crud-renderer-state.ts 的 useEffect cleanup）已正确处理语义取消，fetcher 监听
    // signal 是冗余的带宽优化。但 mainHttpClient（client.ts:188）当前把无 reason 的
    // parent abort 误判为 timeout 并抛错，导致 crud loadAction 收到空结果。
    // 因此这里刻意不传 ctx.signal —— 让请求自然完成，由 flux cancelled flag 决定是否丢弃。
    fetcher: async (api: FluxApiRequest, _ctx: FluxApiRequestContext) => {
      recordFluxDebug({ phase: 'request', url: api.url, method: api.method, data: api.data });
      const resp = await nopRpcRequest({
        url: api.url,
        method: api.method,
        params: api.params,
        data: api.data,
        headers: api.headers,
        selection: api.selection || undefined,
        responseType: api.responseType,
        downloadFileName: api.downloadFileName,
      });
      recordFluxDebug({
        phase: 'response',
        url: api.url,
        ok: resp.ok,
        status: resp.status,
        dataPreview: JSON.stringify(resp.data ?? null).slice(0, 300),
      });
      return resp;
    },
    monitor: {
      onError: (payload: { phase: string; error: unknown }) => {
        recordFluxDebug({
          phase: 'error',
          url: payload.phase,
          error:
            payload.error instanceof Error
              ? payload.error.message
              : String(payload.error?.toString?.() ?? payload.error),
        });
        console.warn(
          '[flux] error phase=' + payload.phase +
          ' err=' + (payload.error instanceof Error ? payload.error.message : String(payload.error?.toString?.() ?? payload.error)),
        );
      },
    },
    notify: (level: FluxNotifyLevel, message: string) => {
      recordFluxDebug({ phase: 'notify', level, message });
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
    confirm: async (message: string, title?: string) =>
      confirmInApp(message, { title, className: 'flux-confirm-dialog' }),
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
