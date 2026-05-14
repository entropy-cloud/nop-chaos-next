import { registerMainXuiComponents } from './xuiComponents';

let didInitAmisRuntime = false;
let amisRuntimeInitPromise: Promise<void> | null = null;

async function loadAmisStyles() {
  await import('amis/lib/themes/cxd.css');
  await import('../styles/amis-theme-bridge.css');
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
