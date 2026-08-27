import { isMockEnabled } from '../config/env';
import { fetchPageSchema } from '../services/pageApi';
import { nopRpcRequest } from '../services/http';
import type { FluxSchema } from '@nop-chaos/flux';

interface DictOption {
  label: string;
  value: string;
  code?: string;
  description?: string;
}

interface DictBean {
  name: string;
  label?: string;
  locale?: string;
  valueType?: string;
  options: DictOption[];
}

export async function fetchFluxPage(
  schemaPath: string,
  signal?: AbortSignal,
): Promise<FluxSchema> {
  const value = await fetchPageSchema(schemaPath, signal);

  if (!(value && typeof value === 'object' && 'type' in value)) {
    throw new Error(
      `Invalid Flux schema loaded from "${schemaPath}": expected an object with a "type" field`,
    );
  }

  return value as FluxSchema;
}

const MOCK_DICTS: Record<string, DictOption[]> = {
  role: [
    { label: '管理员', value: 'admin' },
    { label: '用户', value: 'user' },
    { label: '访客', value: 'guest' },
  ],
  status: [
    { label: '启用', value: 'active' },
    { label: '禁用', value: 'disabled' },
  ],
};

export async function fetchFluxDict(
  dictName: string,
  signal?: AbortSignal,
): Promise<DictBean> {
  if (isMockEnabled()) {
    return { name: dictName, options: MOCK_DICTS[dictName] ?? [] };
  }

  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Dict fetch aborted');
  }

  // REST RPC 无需 @selection，DictProvider 返回完整 DictBean
  const response = await nopRpcRequest<DictBean>({
    url: '@query:DictProvider__getDict',
    data: { dictName },
    signal,
  });

  if (response.status !== 0) {
    throw new Error(response.msg || `Dict fetch failed: ${response.status}`);
  }

  return response.data ?? { name: dictName, options: [] };
}
