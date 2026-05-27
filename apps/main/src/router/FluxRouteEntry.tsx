import { lazy } from 'react';
import type { ComponentProps } from 'react';

const LazyFluxRouteRenderer = lazy(async () => {
  const { ensureFluxRuntime } = await import('../flux/init');
  await ensureFluxRuntime();
  const module = await import('../flux/FluxRouteRenderer');
  return { default: module.FluxRouteRenderer };
});

export function FluxRouteEntry(props: ComponentProps<typeof LazyFluxRouteRenderer>) {
  return <LazyFluxRouteRenderer {...props} />;
}
