import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ComponentType } from "react"

import * as React from "react"
import * as ReactDOM from "react-dom/client"
import * as ReactRouterDOM from "react-router-dom"
import * as LucideReact from "lucide-react"
import * as Recharts from "recharts"
import * as Sonner from "sonner"
import * as Zustand from "zustand"
import * as TanStackQuery from "@tanstack/react-query"
import * as XyflowReact from "@xyflow/react"

import * as RadixDialog from "@radix-ui/react-dialog"
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu"
import * as RadixSelect from "@radix-ui/react-select"
import * as RadixTabs from "@radix-ui/react-tabs"
import * as RadixTooltip from "@radix-ui/react-tooltip"
import * as RadixSeparator from "@radix-ui/react-separator"
import * as RadixCheckbox from "@radix-ui/react-checkbox"
import * as RadixLabel from "@radix-ui/react-label"
import * as RadixScrollArea from "@radix-ui/react-scroll-area"
import * as RadixSlot from "@radix-ui/react-slot"

import * as clsx from "clsx"
import * as tailwindMerge from "tailwind-merge"
import * as cva from "class-variance-authority"
import * as ReactJSXRuntime from "react/jsx-runtime"
import * as ReactI18next from "react-i18next"
import * as I18next from "i18next"

const System = (window as any).System

export interface DynamicModuleConfig {
  id: string
  name: string
  path: string
  componentPath: string
}

interface DynamicModule {
  config: DynamicModuleConfig
  component?: ComponentType
  isLoading: "idle" | "loading" | "loaded" | "error"
  needsReload?: boolean
}

interface DynamicModulesState {
  modules: Record<string, DynamicModule>
  loadModule: (config: DynamicModuleConfig) => Promise<void>
  unloadModule: (id: string) => void
  getModule: (id: string) => DynamicModule | undefined
  clearStorage: () => void
}

let globalsRegistered = false

function registerGlobalModules(): void {
  if (globalsRegistered) return

  const moduleMap: Record<string, any> = {
    react: React,
    "react/jsx-runtime": ReactJSXRuntime,
    "react-dom": ReactDOM,
    "react-router-dom": ReactRouterDOM,
    "lucide-react": LucideReact,
    recharts: Recharts,
    sonner: Sonner,
    zustand: Zustand,
    "@tanstack/react-query": TanStackQuery,
    "@xyflow/react": XyflowReact,
    "@radix-ui/react-dialog": RadixDialog,
    "@radix-ui/react-dropdown-menu": RadixDropdownMenu,
    "@radix-ui/react-select": RadixSelect,
    "@radix-ui/react-tabs": RadixTabs,
    "@radix-ui/react-tooltip": RadixTooltip,
    "@radix-ui/react-separator": RadixSeparator,
    "@radix-ui/react-checkbox": RadixCheckbox,
    "@radix-ui/react-label": RadixLabel,
    "@radix-ui/react-scroll-area": RadixScrollArea,
    "@radix-ui/react-slot": RadixSlot,
    clsx: clsx,
    "tailwind-merge": tailwindMerge,
    "class-variance-authority": cva,
    "react-i18next": ReactI18next,
    i18next: I18next,
  }

  for (const [name, lib] of Object.entries(moduleMap)) {
    let libPath = name
    if (name.startsWith("./")) {
      libPath = System.resolve(name)
    } else if (name.startsWith("@nop/")) {
      libPath = System.resolve(
        "./nop/" + name.substring("@nop/".length) + ".js"
      )
    } else {
      libPath = System.resolve("./nop/" + name + ".js")
      System.addImportMap({
        imports: {
          [name]: libPath,
        },
      })
    }
    System.set(libPath, lib)
  }

  console.log("[SystemJS] Registered modules:", Object.keys(moduleMap))

  globalsRegistered = true
}

export const useDynamicModulesStore = create<DynamicModulesState>()(
  persist(
    (set, get) => ({
      modules: {},

      loadModule: async (config: DynamicModuleConfig) => {
        const existing = get().modules[config.id]

        if (existing?.isLoading === "loaded") {
          console.log("[DynamicModules] Module already loaded:", config.id)
          return
        }

        console.log(
          "[DynamicModules] Loading module:",
          config.id,
          config.componentPath
        )

        set({
          modules: {
            ...get().modules,
            [config.id]: {
              config,
              isLoading: "loading",
            },
          },
        })

        try {
          registerGlobalModules()

          const moduleUrl = config.componentPath
          console.log("[DynamicModules] Importing from:", moduleUrl)
          const module = await System.import(moduleUrl)

          console.log("[DynamicModules] Module imported:", module)
          console.log("[DynamicModules] Module type:", typeof module)
          console.log(
            "[DynamicModules] Module keys:",
            Object.keys(module || {})
          )
          console.log("[DynamicModules] Module default:", module?.default)

          let Component: ComponentType | undefined

          if (typeof module === "function") {
            Component = module as ComponentType
            console.log("[DynamicModules] Component extracted from function")
          } else if (module && typeof module === "object") {
            Component = module.default as ComponentType
            console.log(
              "[DynamicModules] Component extracted from default:",
              Component
            )
          }

          if (!Component) {
            console.error("[DynamicModules] No valid component found in module")
            throw new Error("Module export not found")
          }

          console.log(
            "[DynamicModules] Component loaded successfully:",
            Component
          )

          set({
            modules: {
              ...get().modules,
              [config.id]: {
                config,
                component: Component,
                isLoading: "loaded",
              },
            },
          })
        } catch (error) {
          console.error("[DynamicModules] Failed to load module:", error)
          console.error("[DynamicModules] Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
          set({
            modules: {
              ...get().modules,
              [config.id]: {
                config,
                component: undefined,
                isLoading: "error",
              },
            },
          })
        }
      },

      unloadModule: (id: string) => {
        const newModules = { ...get().modules }
        delete newModules[id]
        set({ modules: newModules })
      },

      getModule: (id: string) => get().modules[id],

      clearStorage: () => {
        console.log("[DynamicModules] Clearing all module storage")
        set({ modules: {} })
      },
    }),
    {
      name: "dynamic-modules-storage",
      partialize: (state) => ({
        modules: Object.fromEntries(
          Object.entries(state.modules).map(([id, module]) => {
            const wasLoaded = module.isLoading === "loaded"
            const isLoading = wasLoaded ? ("idle" as const) : module.isLoading
            return [
              id,
              {
                ...module,
                component: undefined,
                isLoading,
                needsReload: true,
              },
            ]
          })
        ),
      }),
    }
  )
)
