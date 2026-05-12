import { registerMainXuiComponents } from './xuiComponents';

let didInitAmisRuntime = false;
let amisRuntimeInitPromise: Promise<void> | null = null;

async function loadAmisStyles() {
  await Promise.all([import('amis/lib/themes/cxd.css'), import('../styles/amis-theme-bridge.css')]);
}

export function ensureAmisRuntime(): Promise<void> {
  if (didInitAmisRuntime) {
    return Promise.resolve();
  }

  if (amisRuntimeInitPromise) {
    return amisRuntimeInitPromise;
  }

  amisRuntimeInitPromise = loadAmisStyles().then(() => {
    registerMainXuiComponents();
    didInitAmisRuntime = true;
  });

  return amisRuntimeInitPromise;
}

export interface AmisInitModule {
  ensureAmisRuntime: typeof ensureAmisRuntime;
}
