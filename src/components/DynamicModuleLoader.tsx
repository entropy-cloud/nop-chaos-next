import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useDynamicModulesStore } from "@/stores/dynamic-modules"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface DynamicModuleLoaderProps {
  config: {
    id: string
    name: string
    path: string
    componentPath: string
  }
}

export function DynamicModuleLoader({ config }: DynamicModuleLoaderProps) {
  const { t } = useTranslation()
  const { modules, loadModule, clearStorage } = useDynamicModulesStore()
  const module = modules[config.id]
  const hasTriggeredReload = useRef(false)
  const storageCleared = useRef(false)

  console.log("[DynamicModuleLoader] Render", {
    configId: config.id,
    moduleState: module,
    hasComponent: !!module?.component,
    isLoading: module?.isLoading,
    needsReload: module?.needsReload,
  })

  useEffect(() => {
    if (
      !storageCleared.current &&
      module?.isLoading === "loaded" &&
      !module?.component
    ) {
      console.log(
        "[DynamicModuleLoader] Detected corrupted storage state, clearing..."
      )
      clearStorage()
      storageCleared.current = true
    }
  }, [module?.isLoading, module?.component, clearStorage])

  useEffect(() => {
    console.log("[DynamicModuleLoader] useEffect check", {
      needsReload: module?.needsReload,
      hasComponent: !!module?.component,
      hasTriggeredReload: hasTriggeredReload.current,
    })
    if (
      module?.needsReload &&
      !module?.component &&
      !hasTriggeredReload.current
    ) {
      console.log("[DynamicModuleLoader] Triggering reload")
      hasTriggeredReload.current = true
      loadModule(config).finally(() => {
        hasTriggeredReload.current = false
      })
    }
  }, [module?.needsReload, module?.component, loadModule, config])

  if (!module || module.isLoading === "idle") {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card p-8">
          <CardContent className="text-center">
            <h3 className="text-lg font-semibold mb-4">{config.name}</h3>
            <p className="text-muted-foreground mb-4">
              {t("dynamicModule.clickToLoad")}
            </p>
            <Button
              onClick={() => loadModule(config)}
              className="gradient-primary text-white"
            >
              {t("dynamicModule.loadModule")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (module.isLoading === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t("dynamicModule.loading")}</span>
      </div>
    )
  }

  if (module.isLoading === "error") {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card p-8">
          <CardContent className="text-center">
            <h3 className="text-lg font-semibold mb-4 text-destructive">
              {t("dynamicModule.loadFailed")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("dynamicModule.cannotLoad", { moduleName: config.name })}
            </p>
            <Button onClick={() => loadModule(config)} variant="outline">
              {t("dynamicModule.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (module.isLoading === "loaded") {
    if (module.component) {
      const Component = module.component
      console.log("[DynamicModuleLoader] Rendering component:", Component)
      return <Component />
    }
    console.error("[DynamicModuleLoader] Loaded but no component!")
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t("dynamicModule.reloading")}</span>
      </div>
    )
  }

  return null
}
