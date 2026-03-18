import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { EdgeInspector } from './EdgeInspector'
import { NodeInspector } from './NodeInspector'
import type { FlowEdge, FlowNode } from '../types'

interface FlowMobilePanelsProps {
  propertyOpen: boolean
  setPropertyOpen: (open: boolean) => void
  edgePanelOpen: boolean
  setEdgePanelOpen: (open: boolean) => void
  selectedNode: FlowNode | null
  selectedEdge: FlowEdge | null
  nodes: FlowNode[]
  updateNodeData: (nodeId: string, updater: (node: FlowNode) => FlowNode) => void
  updateEdgeData: (edgeId: string, updater: (edge: FlowEdge) => FlowEdge) => void
}

export function FlowMobilePanels({
  propertyOpen,
  setPropertyOpen,
  edgePanelOpen,
  setEdgePanelOpen,
  selectedNode,
  selectedEdge,
  nodes,
  updateNodeData,
  updateEdgeData
}: FlowMobilePanelsProps) {
  const { t } = useTranslation()

  return (
    <>
      <Sheet open={propertyOpen} onOpenChange={setPropertyOpen}>
        <SheetContent side="right" className="w-[30rem] max-w-[92vw] border-l border-[hsl(var(--border))] bg-background shadow-xl sm:max-w-[30rem]">
          <SheetHeader>
            <SheetTitle>{t('flowEditor.editor.nodeSheetTitle')}</SheetTitle>
            <SheetDescription>{t('flowEditor.editor.nodeSheetDescription')}</SheetDescription>
          </SheetHeader>
          {selectedNode ? <div className="px-4 pb-6"><NodeInspector selectedNode={selectedNode} nodes={nodes} updateNodeData={updateNodeData} /></div> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={edgePanelOpen} onOpenChange={setEdgePanelOpen}>
        <SheetContent side="right" className="w-[26rem] max-w-[92vw] border-l border-[hsl(var(--border))] bg-background shadow-xl sm:max-w-[26rem]">
          <SheetHeader>
            <SheetTitle>{t('flowEditor.editor.edgeSheetTitle')}</SheetTitle>
            <SheetDescription>{t('flowEditor.editor.edgeSheetDescription')}</SheetDescription>
          </SheetHeader>
          {selectedEdge ? <div className="px-4 pb-6"><EdgeInspector selectedEdge={selectedEdge} updateEdgeData={updateEdgeData} /></div> : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
