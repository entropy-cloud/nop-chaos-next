import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Tab {
  key: string
  label: string
  labelKey?: string
  path: string
  closable?: boolean
}

interface TabState {
  tabs: Tab[]
  activeKey: string
  addTab: (tab: Tab) => void
  removeTab: (key: string) => void
  setActiveKey: (key: string) => void
  refreshTab: (key: string) => void
}

const defaultTabs: Tab[] = [
  {
    key: "/",
    label: "仪表盘",
    labelKey: "menu.dashboard",
    path: "/",
    closable: false,
  },
]

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: defaultTabs,
      activeKey: "/",
      addTab: (tab: Tab) => {
        const existing = get().tabs.find((t) => t.key === tab.key)
        if (existing) {
          set({ activeKey: tab.key })
          return
        }
        set({
          tabs: [...get().tabs, tab],
          activeKey: tab.key,
        })
      },
      removeTab: (key: string) => {
        const { tabs, activeKey } = get()
        if (tabs.length === 1) return
        const newTabs = tabs.filter((t) => t.key !== key)
        let newActiveKey = activeKey
        if (activeKey === key) {
          const index = tabs.findIndex((t) => t.key === key)
          newActiveKey =
            newTabs[Math.max(0, index - 1)]?.key || newTabs[0]?.key || ""
        }
        set({ tabs: newTabs, activeKey: newActiveKey })
      },
      setActiveKey: (key: string) => {
        set({ activeKey: key })
      },
      refreshTab: (key: string) => {
        const tab = get().tabs.find((t) => t.key === key)
        if (tab) {
          set({
            tabs: get().tabs.map((t) => (t.key === key ? { ...t } : t)),
          })
        }
      },
    }),
    {
      name: "tabs-storage",
    }
  )
)
