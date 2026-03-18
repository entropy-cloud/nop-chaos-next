import 'amis/lib/themes/cxd.css'
import '../styles/amis-theme-bridge.css'
import { registerMainXuiComponents } from './xuiComponents'

let didInitAmisRuntime = false

export function ensureAmisRuntime() {
  if (didInitAmisRuntime) {
    return
  }

  didInitAmisRuntime = true
  registerMainXuiComponents()
}
