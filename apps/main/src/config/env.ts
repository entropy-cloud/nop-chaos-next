export function isMockEnabled() {
  return import.meta.env.VITE_ENABLE_MOCK === 'true';
}

export function isPrototypeMode() {
  return Boolean(import.meta.env.VITE_PROTOTYPE_DIR);
}
