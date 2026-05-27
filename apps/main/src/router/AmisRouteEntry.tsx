import { lazy } from 'react';

export const AmisRouteEntry = lazy(async () => {
  const [{ ensureAmisRuntime }, module] = await Promise.all([
    import('../amis/init'),
    import('../amis/AmisRouteRenderer'),
  ]);
  await ensureAmisRuntime();
  return { default: module.AmisRouteRenderer };
});
