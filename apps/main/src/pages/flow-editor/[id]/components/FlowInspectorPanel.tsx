import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Button, Card, CardContent, ScrollArea } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { NodeInspector } from './NodeInspector'
import { EdgeInspector } from './EdgeInspector'
import type { FlowDocument } from '../../../../services/mockApi'
import type { FlowEdge, FlowNode, FlowSelectionSummary } from '../types'

interface FlowInspectorPanelProps {
  inspectorCollapsed: boolean
  inspectorHandleLabel: string
  flowDocument: FlowDocument | null
  nodeCount: number
  edgeCount: number
  activeSummary: FlowSelectionSummary | null
  selectedNode: FlowNode | null
  selectedEdge: FlowEdge | null
  nodes: FlowNode[]
  updateNodeData: (nodeId: string, updater: (node: FlowNode) => FlowNode) => void
  updateEdgeData: (edgeId: string, updater: (edge: FlowEdge) => FlowEdge) => void
  onToggleCollapsed: () => void
}

export function FlowInspectorPanel({
  inspectorCollapsed,
  inspectorHandleLabel,
  flowDocument,
  nodeCount,
  edgeCount,
  activeSummary,
  selectedNode,
  selectedEdge,
  nodes,
  updateNodeData,
  updateEdgeData,
  onToggleCollapsed
}: FlowInspectorPanelProps) {
  const { t } = useTranslation()

  return (
    <>
      {inspectorCollapsed ? null : (
        <Card className="theme-card hidden min-h-0 overflow-hidden xl:flex xl:flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{t('flowEditor.editor.properties')}</div>
                <div className="meta-text">{t('flowEditor.editor.propertiesHint')}</div>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1 px-4 py-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 text-sm dark:bg-slate-900/25">
                  <div className="eyebrow-text">{t('flowEditor.editor.flow')}</div>
                  <div className="mt-2 font-medium text-foreground">{flowDocument?.name}</div>
                  <p className="meta-text mt-2">{flowDocument?.description}</p>
                  <div className="meta-text mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={flowDocument?.status === 'enabled' ? 'success' : flowDocument?.status === 'disabled' ? 'outline' : 'warning'}>
                      {flowDocument?.status ? t(`common.flowStatuses.${flowDocument.status}`) : null}
                    </Badge>
                    <span>{t('flowEditor.editor.nodeCount', { count: nodeCount })}</span>
                    <span>{t('flowEditor.editor.edgeCount', { count: edgeCount })}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/25">
                  <div className="eyebrow-text">{t('flowEditor.editor.currentSelection')}</div>
                  {activeSummary ? (
                    <div className="mt-3 space-y-1">
                      <div className="font-medium text-foreground">{activeSummary.title}</div>
                      <div className="meta-text">{activeSummary.type}</div>
                      <p className="meta-text">{activeSummary.description}</p>
                    </div>
                  ) : (
                    <p className="meta-text mt-3">{t('flowEditor.editor.selectionEmpty')}</p>
                  )}
                </div>
                <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/25">
                  {selectedNode ? <NodeInspector selectedNode={selectedNode} nodes={nodes} updateNodeData={updateNodeData} /> : selectedEdge ? <EdgeInspector selectedEdge={selectedEdge} updateEdgeData={updateEdgeData} /> : (
                    <div className="meta-text space-y-2">
                      <div>{t('flowEditor.editor.shortcuts.undo')}</div>
                      <div>{t('flowEditor.editor.shortcuts.redo')}</div>
                      <div>{t('flowEditor.editor.shortcuts.copyPaste')}</div>
                      <div>{t('flowEditor.editor.shortcuts.delete')}</div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      <Button
        variant="outline"
        size="sm"
        className="absolute right-0 top-1/2 z-20 hidden h-32 -translate-y-1/2 translate-x-[42%] rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] px-2 py-3 shadow-lg backdrop-blur-xl xl:inline-flex"
        onClick={onToggleCollapsed}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm font-medium text-foreground">
          {inspectorCollapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          <span className="writing-mode-vertical text-sm tracking-[0.18em] [writing-mode:vertical-rl]">{inspectorHandleLabel}</span>
        </div>
      </Button>
    </>
  )
}
