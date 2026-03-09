import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getMenuConfig } from "@/api/menu"
import { useMenuStore } from "./menu"

export interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  fetchMenus: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      fetchMenus: async () => {
        try {
          const menuData = await getMenuConfig()
          useMenuStore.setState({
            menus: menuData.menus,
            version: menuData.version,
            timestamp: menuData.timestamp,
          })
          useMenuStore.getState().flattenMenus()
        } catch (error) {
          console.error("[Auth] Failed to fetch menus:", error)
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
)
