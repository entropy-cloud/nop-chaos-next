export function isMockEnabled() {
  return import.meta.env.VITE_ENABLE_MOCK === 'true'
}
