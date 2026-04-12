let didInitFluxRuntime = false

export function ensureFluxRuntime() {
  if (didInitFluxRuntime) {
    return
  }

  didInitFluxRuntime = true

  console.log('[Flux] Runtime initialized')
}
