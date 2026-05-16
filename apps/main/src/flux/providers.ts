import { isMockEnabled } from '../config/env';
import { loadSchemaAsset } from '../services/schemaAsset';
import type { FluxSchema } from '@nop-chaos/flux';

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
