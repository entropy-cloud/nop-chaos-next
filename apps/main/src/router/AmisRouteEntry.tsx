import { lazy } from 'react';
import type { ComponentProps } from 'react';

const LazyAmisRouteRenderer = lazy(async () => {
  const [{ ensureAmisRuntime }, module] = await Promise.all([
    import('../amis/init'),
    import('../amis/AmisRouteRenderer'),
  ]);
  await ensureAmisRuntime();
  return { default: module.AmisRouteRenderer };
});

export function AmisRouteEntry(props: ComponentProps<typeof LazyAmisRouteRenderer>) {
  return <LazyAmisRouteRenderer {...props} />;
}
