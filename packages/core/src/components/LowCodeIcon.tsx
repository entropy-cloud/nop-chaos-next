import type { AppIconName } from '@nop-chaos/shared'
import type { LucideProps } from 'lucide-react'
import { getIconByName } from '../utils/iconMap'

export interface LowCodeIconProps extends LucideProps {
  name?: string
  fallback?: AppIconName
}

export function LowCodeIcon({ fallback = 'home', name, ...props }: LowCodeIconProps) {
  const Icon = getIconByName(name, fallback)
  return <Icon {...props} />
}
