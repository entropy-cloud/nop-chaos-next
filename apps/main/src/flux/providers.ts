import { isMockEnabled } from '../config/env';
import { loadSchemaAsset } from '../services/schemaAsset';

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

export async function fetchFluxPage(schemaPath: string, signal?: AbortSignal) {
  if (schemaPath === 'mock://flux-demo') {
    return getDemoSchema(signal);
  }

  if (isMockEnabled() || schemaPath.startsWith('/mock') || schemaPath.endsWith('.json')) {
    return loadSchemaAsset(schemaPath, { signal });
  }

  throw new Error(`Unsupported Flux schema path: ${schemaPath}`);
}
