let didInitFluxRuntime = false;

export async function ensureFluxRuntime() {
  if (didInitFluxRuntime) {
    return;
  }

  await import('@nop-chaos/flux/style.css');
  await import('../styles/flux-spacing.css');
  didInitFluxRuntime = true;
}
