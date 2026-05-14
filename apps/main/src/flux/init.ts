let didInitFluxRuntime = false;

export async function ensureFluxRuntime() {
  if (didInitFluxRuntime) {
    return;
  }

  await import('@nop-chaos/flux/style.css');
  didInitFluxRuntime = true;
}
