import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { MenuItem, FlatMenuItem } from "@/types/menu"

interface MenuState {
  menus: MenuItem[]
  version?: string
  timestamp?: number
  flatMenus: FlatMenuItem[]
  setMenus: (menus: MenuItem[], version?: string, timestamp?: number) => void
  clearMenus: () => void
  getMenuItem: (id: string) => MenuItem | undefined
  getMenuItemByPath: (path: string) => MenuItem | undefined
  flattenMenus: () => void
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      menus: [],
      version: undefined,
      timestamp: undefined,
      flatMenus: [],

      setMenus: (menus, version, timestamp) => {
        set({ menus, version, timestamp })
        get().flattenMenus()
      },

      clearMenus: () => {
        set({
          menus: [],
          version: undefined,
          timestamp: undefined,
          flatMenus: [],
        })
      },

      getMenuItem: (id) => {
        const { menus } = get()

        function findItem(items: MenuItem[]): MenuItem | undefined {
          for (const item of items) {
            if (item.id === id) return item
            if (item.children) {
              const found = findItem(item.children)
              if (found) return found
            }
          }
          return undefined
        }

        return findItem(menus)
      },

      getMenuItemByPath: (path) => {
        const { menus } = get()

        function findItem(items: MenuItem[]): MenuItem | undefined {
          for (const item of items) {
            if (item.path === path) return item
            if (item.children) {
              const found = findItem(item.children)
              if (found) return found
            }
          }
          return undefined
        }

        return findItem(menus)
      },

      flattenMenus: () => {
        const { menus } = get()
        const flatMenus: FlatMenuItem[] = []

        function flatten(
          items: MenuItem[],
          parentPath?: string,
          level = 0
        ): void {
          for (const item of items) {
            if (item.meta?.hidden) continue

            flatMenus.push({
              ...item,
              parentPath,
              level,
            })

            if (item.children) {
              flatten(item.children, item.path, level + 1)
            }
          }
        }

        flatten(menus)
        set({ flatMenus })
      },
    }),
    {
      name: "menu-storage",
      partialize: (state) => ({
        menus: state.menus,
        version: state.version,
        timestamp: state.timestamp,
      }),
    }
  )
)
