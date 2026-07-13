import { Renderer } from 'amis-core';
import { VueRendererControl } from './VueRenderer';

let rendererRegistered = false;

export function registerVueRenderer(): void {
  if (rendererRegistered) {
    return;
  }

  Renderer({ type: 'vue-renderer', autoVar: false })(VueRendererControl);
  rendererRegistered = true;
}
