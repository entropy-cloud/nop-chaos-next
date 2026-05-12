import type { HTMLAttributes } from 'react';
import type { AppIconName } from '@nop-chaos/shared';
import { renderIcon } from '../utils/icon-map';

export interface LowCodeIconProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  fallback?: AppIconName;
}

export function LowCodeIcon({ fallback = 'home', name, ...props }: LowCodeIconProps) {
  return renderIcon(name, props, fallback);
}
