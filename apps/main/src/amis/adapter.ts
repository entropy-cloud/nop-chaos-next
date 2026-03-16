import type { AmisDictProvider, AmisPageProvider, AmisRuntimeAdapter } from '@nop-chaos/amis-core'
import { toast } from '@nop-chaos/ui'
import i18n from '../config/i18n'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'

interface CreateMainAmisAdapterOptions {
  currentPath: string
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  pageProvider: AmisPageProvider
  dictProvider: AmisDictProvider
}

export function createMainAmisAdapter({ currentPath, navigate, pageProvider, dictProvider }: CreateMainAmisAdapterOptions): AmisRuntimeAdapter {
  return {
    getI18n: () => i18n,
    getLocale: () => i18n.language,
    getCurrentUser: () => useAuthStore.getState().user,
    getAuthToken: () => useAuthStore.getState().token,
    setAuthToken: (token) => {
      const state = useAuthStore.getState()

      if (!token) {
        state.logout()
        return
      }

      if (state.user) {
        state.login({ user: state.user, token })
      }
    },
    hasRole: (role) => (useAuthStore.getState().user?.roles ?? []).includes(role),
    getThemeConfig: () => useThemeStore.getState().themeConfig,
    navigate,
    isCurrentUrl: (to) => currentPath === to,
    resolveAction: (name) => {
      if (name === 'preview.notify') {
        return () => {
          toast.success('Amis action binding is working')
          return { acknowledged: true }
        }
      }

      if (name === 'preview.navigatePlugins') {
        return () => {
          navigate('/plugins')
          return { redirected: true }
        }
      }

      return undefined
    },
    notify: (type, message) => {
      if (type === 'success') {
        toast.success(message)
        return
      }

      if (type === 'error') {
        toast.error(message)
        return
      }

      toast(message)
    },
    alert: async (message) => {
      toast(message)
    },
    confirm: async (message) => {
      toast(message)
      return true
    },
    logout: () => {
      useAuthStore.getState().logout()
      navigate('/auth/login', { replace: true })
    },
    pageProvider,
    dictProvider,
    compileFunction: (code, page) => new Function('page', `return (${code})`)(page) as Function
  }
}
