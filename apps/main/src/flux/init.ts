let didInitFluxRuntime = false;

export function ensureFluxRuntime() {
  if (didInitFluxRuntime) {
    return;
  }

  didInitFluxRuntime = true;
}
