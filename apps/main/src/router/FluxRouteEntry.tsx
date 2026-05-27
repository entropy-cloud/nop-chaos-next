import { lazy } from 'react';

export const FluxRouteEntry = lazy(async () => {
  const { ensureFluxRuntime } = await import('../flux/init');
  await ensureFluxRuntime();
  const module = await import('../flux/FluxRouteRenderer');
  return { default: module.FluxRouteRenderer };
});
