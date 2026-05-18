import { useSyncExternalStore } from 'react';
import { getShellRuntimeConfig, subscribeShellRuntimeConfig } from '@nop-chaos/extension-host';

export function useShellConfig() {
  return useSyncExternalStore(
    subscribeShellRuntimeConfig,
    getShellRuntimeConfig,
    getShellRuntimeConfig,
  );
}
