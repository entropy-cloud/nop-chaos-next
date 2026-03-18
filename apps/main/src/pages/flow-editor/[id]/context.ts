import { createContext, useContext } from 'react'
import type { FlowEditorActions } from './types'

export const FlowEditorActionsContext = createContext<FlowEditorActions | null>(null)

export function useFlowEditorActions(): FlowEditorActions {
  const context = useContext(FlowEditorActionsContext)
  if (!context) throw new Error('Flow editor actions are unavailable')
  return context
}
