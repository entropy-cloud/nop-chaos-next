import type { ShellExtension } from '@nop-chaos/shared';

const extension: ShellExtension = {
  id: 'external-demo',
  order: 50,
  branding: {
    name: 'External Demo',
    shortName: 'External Demo',
  },
  builtinPages: [],
  userMenuItems: [],
};

export default extension;
