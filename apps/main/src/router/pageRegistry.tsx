import { lazy } from 'react'
import type { ContributionBuiltinPageComponent } from '@nop-chaos/shared'
import LoginPage from '../pages/auth/login'
import ForbiddenPage from '../pages/errors/403'
import NotFoundPage from '../pages/errors/404'
import ServerErrorPage from '../pages/errors/500'

type BuiltinPage = ContributionBuiltinPageComponent

const AIWorkbenchPage = lazy(() => import('../pages/ai-workbench'))
const DashboardPage = lazy(() => import('../pages/dashboard'))
const DataManagementPage = lazy(() => import('../pages/data-management'))
const FlowEditorPage = lazy(() => import('../pages/flow-editor'))
const FlowEditorEditPage = lazy(() => import('../pages/flow-editor/[id]'))
const HelpGuidePage = lazy(() => import('../pages/help/guide'))
const HelpHomePage = lazy(() => import('../pages/help'))
const MasterDetailPage = lazy(() => import('../pages/data-management/master-detail'))
const MasterDetailDetailPage = lazy(() => import('../pages/data-management/master-detail/[id]'))
const PluginsManagementPage = lazy(() => import('../pages/plugins/management'))
const PluginsHomePage = lazy(() => import('../pages/plugins'))
const SettingsLanguagePage = lazy(() => import('../pages/settings/language'))
const SettingsLayoutPage = lazy(() => import('../pages/settings/layout'))
const SettingsThemePage = lazy(() => import('../pages/settings/theme'))
const SettingsHomePage = lazy(() => import('../pages/settings'))

export const builtinPageRegistry: Record<string, BuiltinPage> = {
  'ai-workbench': AIWorkbenchPage,
  dashboard: DashboardPage,
  'data-management': DataManagementPage,
  'flow-editor': FlowEditorPage,
  'flow-editor-edit': FlowEditorEditPage,
  'help-guide': HelpGuidePage,
  'help-home': HelpHomePage,
  'master-detail': MasterDetailPage,
  'master-detail-detail': MasterDetailDetailPage,
  'plugins-management': PluginsManagementPage,
  'plugins-overview': PluginsHomePage,
  'settings-home': SettingsHomePage,
  'settings-language': SettingsLanguagePage,
  'settings-layout': SettingsLayoutPage,
  'settings-theme': SettingsThemePage
}

const contributedBuiltinPageRegistry: Record<string, BuiltinPage> = {}

export function registerBuiltinPages(pages: Array<{ componentId: string; component: BuiltinPage }>) {
  for (const page of pages) {
    contributedBuiltinPageRegistry[page.componentId] = page.component
  }
}

export function getBuiltinPage(componentId?: string): BuiltinPage | undefined {
  if (!componentId) {
    return undefined
  }

  return contributedBuiltinPageRegistry[componentId] ?? builtinPageRegistry[componentId]
}

export { ForbiddenPage, LoginPage, NotFoundPage, ServerErrorPage }
