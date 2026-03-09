import { componentRegistry } from "@/lib/componentRegistry"
import { Dashboard } from "@/modules/dashboard"
import { FlowEditor } from "@/modules/flow"
import { ChartDemo } from "@/modules/chart"
import { AIChat } from "@/modules/ai"
import { CrudDemo } from "@/modules/crud"
import { LayoutDemo } from "@/modules/layout"
import { Settings } from "@/modules/settings"
import { OrderManagement, OrderDetail } from "@/modules/orders"

export function registerBuiltinComponents() {
  componentRegistry.register({
    name: "Dashboard",
    component: Dashboard,
    path: "/",
  })

  componentRegistry.register({
    name: "FlowEditor",
    component: FlowEditor,
    path: "/flow",
  })

  componentRegistry.register({
    name: "ChartDemo",
    component: ChartDemo,
    path: "/chart",
  })

  componentRegistry.register({
    name: "AIChat",
    component: AIChat,
    path: "/ai",
  })

  componentRegistry.register({
    name: "CrudDemo",
    component: CrudDemo,
    path: "/crud",
  })

  componentRegistry.register({
    name: "LayoutDemo",
    component: LayoutDemo,
    path: "/layout",
  })

  componentRegistry.register({
    name: "Settings",
    component: Settings,
    path: "/settings",
  })

  componentRegistry.register({
    name: "OrderManagement",
    component: OrderManagement,
    path: "/orders",
  })

  componentRegistry.register({
    name: "OrderDetail",
    component: OrderDetail,
    path: "/orders/detail/:id",
  })

  console.log("[BuiltinComponents] All components registered successfully")
}
