import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { componentRegistry } from "@/lib/componentRegistry"
import { useDynamicModulesStore } from "@/stores/dynamic-modules"
import { useMenuStore } from "@/stores/menu"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

interface DynamicPageWrapperProps {
  menuId?: string
}

export function DynamicPageWrapper({ menuId }: DynamicPageWrapperProps) {
  const { t } = useTranslation()
  const params = useParams()
  const { modules, loadModule } = useDynamicModulesStore()
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPageComponent() {
      setLoading(true)
      setError(null)
      setComponent(null)

      let menuItem = null
      if (menuId) {
        menuItem = useMenuStore.getState().getMenuItem(menuId)
      } else if (params["*"]) {
        menuItem = useMenuStore.getState().getMenuItemByPath(`/${params["*"]}`)
      }

      if (!menuItem?.page) {
        setError(t("dynamicPage.pageConfigNotFound"))
        setLoading(false)
        return
      }

      try {
        const { page } = menuItem

        if (page.type === "builtin") {
          const registration = componentRegistry.get(page.componentName)
          if (!registration) {
            setError(
              t("dynamicPage.componentNotRegistered", {
                componentName: page.componentName,
              })
            )
          } else {
            const WrappedComponent = registration.component
            setComponent(() => (props: any) => (
              <WrappedComponent {...props} {...page.params} />
            ))
          }
        } else if (page.type === "plugin") {
          const existingModule = modules[page.moduleId]
          if (existingModule?.component) {
            const PluginComponent = existingModule.component
            setComponent(() => (props: any) => (
              <PluginComponent {...props} {...page.params} />
            ))
          } else {
            await loadModule({
              id: page.moduleId,
              name: page.moduleId,
              path: "",
              componentPath: page.componentPath,
            })

            const module =
              useDynamicModulesStore.getState().modules[page.moduleId]
            if (module?.component) {
              const ModuleComponent = module.component
              setComponent(() => (props: any) => (
                <ModuleComponent {...props} {...page.params} />
              ))
            } else {
              setError(t("dynamicPage.pluginModuleLoadFailed"))
            }
          }
        } else if (page.type === "external") {
          window.location.href = page.url
          return
        }
      } catch (err) {
        console.error("[DynamicPageWrapper] Error loading component:", err)
        setError(
          err instanceof Error ? err.message : t("dynamicPage.loadFailed")
        )
      } finally {
        setLoading(false)
      }
    }

    loadPageComponent()
  }, [menuId, params, modules, loadModule])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">正在加载...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card p-8">
          <CardContent className="text-center">
            <h3 className="text-lg font-semibold mb-4 text-destructive">
              加载失败
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return Component ? <Component /> : null
}
