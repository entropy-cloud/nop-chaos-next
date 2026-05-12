import 'amis/lib/themes/cxd.css';
import '../styles/amis-theme-bridge.css';
import { registerMainXuiComponents } from './xui-components';

let didInitAmisRuntime = false;

export function ensureAmisRuntime() {
  if (didInitAmisRuntime) {
    return;
  }

  didInitAmisRuntime = true;
  registerMainXuiComponents();
}

export interface AmisInitModule {
  ensureAmisRuntime: typeof ensureAmisRuntime;
}
