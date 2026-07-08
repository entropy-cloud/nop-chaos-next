import { isMockEnabled } from '../config/env';
import { loadSchemaAsset } from '../services/schemaAsset';
import { ajaxQuery } from '../services/http';
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

async function getDemoSchema(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Flux schema request aborted');
  }

  const module = await import('./testSchema');

  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Flux schema request aborted');
  }

  return module.testFluxSchemaInput;
}

export async function fetchFluxPage(
  schemaPath: string,
  signal?: AbortSignal,
): Promise<FluxSchema> {
  let value: unknown;

  if (schemaPath === 'mock://flux-demo') {
    value = await getDemoSchema(signal);
  } else if (
    isMockEnabled() ||
    schemaPath.startsWith('/mock') ||
    schemaPath.endsWith('.json')
  ) {
    value = await loadSchemaAsset(schemaPath, { signal });
  } else {
    throw new Error(`Unsupported Flux schema path: ${schemaPath}`);
  }

  if (!(value && typeof value === 'object' && 'type' in value)) {
    throw new Error(
      `Invalid Flux schema loaded from "${schemaPath}": expected an object with a "type" field`,
    );
  }

  return value as FluxSchema; // safety: validated above
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

  const options = await ajaxQuery<DictOption[]>(
    '@query:DictProvider__getDict/static,options{value,label}',
    { dictName },
    { signal },
  );

  return { name: dictName, options };
}
