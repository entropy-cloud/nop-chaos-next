import { createContext, useContext } from 'react';
import type { FlowEditorActions, FlowEditorHoverState } from './types';

export const FlowEditorActionsContext = createContext<FlowEditorActions | null>(null);
export const FlowEditorHoverContext = createContext<FlowEditorHoverState | null>(null);

export function useFlowEditorActions(): FlowEditorActions {
  const context = useContext(FlowEditorActionsContext);
  if (!context) throw new Error('Flow editor actions are unavailable');
  return context;
}

export function useFlowEditorHover(): FlowEditorHoverState {
  const context = useContext(FlowEditorHoverContext);
  if (!context) throw new Error('Flow editor hover state is unavailable');
  return context;
}
