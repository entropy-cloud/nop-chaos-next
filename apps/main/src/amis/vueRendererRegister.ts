import {
  registerVueRenderer,
  registerVueRenderComponent,
} from '@nop-chaos/amis-react';
import { IconCellRenderer } from './components/IconCellRenderer';

let didRegister = false;

export function registerMainVueRenderer(): void {
  if (didRegister) {
    return;
  }

  registerVueRenderer();
  registerVueRenderComponent('icon', IconCellRenderer);
  didRegister = true;
}
