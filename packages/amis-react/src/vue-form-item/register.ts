import { FormItem } from 'amis-core';
import { VueFormItemControl } from './VueFormItemRenderer';

let rendererRegistered = false;

export function registerVueFormItemRenderer(): void {
  if (rendererRegistered) {
    return;
  }

  FormItem({
    type: 'vue-form-item',
    autoVar: false,
  })(VueFormItemControl);

  rendererRegistered = true;
}
