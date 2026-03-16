import 'amis/lib/themes/cxd.css'
import 'amis/lib/helper.css'

let didInitAmisRuntime = false

export function ensureAmisRuntime() {
  if (didInitAmisRuntime) {
    return
  }

  didInitAmisRuntime = true
}
