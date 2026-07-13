import { registerVueFormItemComponent, registerVueFormItemRenderer } from '@nop-chaos/amis-react';
import { IconPicker } from './components/IconPicker';

let didRegisterVueFormItem = false;

export function registerMainVueFormItem(): void {
  if (didRegisterVueFormItem) {
    return;
  }

  registerVueFormItemRenderer();
  registerVueFormItemComponent('icon-picker', IconPicker);

  didRegisterVueFormItem = true;
}
