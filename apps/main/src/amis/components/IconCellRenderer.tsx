import { LowCodeIcon } from '@nop-chaos/core';

export function IconCellRenderer(props: Record<string, unknown>) {
  const iconName = typeof props.icon === 'string' ? props.icon : undefined;

  return <LowCodeIcon name={iconName} />;
}
