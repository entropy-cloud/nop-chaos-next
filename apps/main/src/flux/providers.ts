import { isMockEnabled } from '../config/env';
import { loadSchemaAsset } from '../services/schemaAsset';

async function getDemoSchema() {
  const module = await import('./testSchema');
  return module.testFluxSchemaInput;
}

export async function fetchFluxPage(schemaPath: string) {
  if (schemaPath === 'mock://flux-demo') {
    return getDemoSchema();
  }

  if (isMockEnabled() || schemaPath.startsWith('/mock') || schemaPath.endsWith('.json')) {
    return loadSchemaAsset(schemaPath);
  }

  throw new Error(`Unsupported Flux schema path: ${schemaPath}`);
}
