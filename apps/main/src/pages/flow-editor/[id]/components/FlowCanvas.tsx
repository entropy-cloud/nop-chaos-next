import type { DragEvent as ReactDragEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes
} from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { SNAP_GRID } from '../constants'
import type { FlowEdge, FlowNode } from '../types'

interface FlowCanvasProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
  nodeTypes: NodeTypes
  edgeTypes: EdgeTypes
  gridEnabled: boolean
  onConnect: (connection: Connection) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onPaneClick: () => void
  onNodeClick: (nodeId: string) => void
  onNodeDoubleClick: (nodeId: string) => void
  onEdgeClick: (edgeId: string) => void
  onEdgeDoubleClick: (edgeId: string) => void
  onCanvasDragOver: (event: ReactDragEvent<HTMLDivElement>) => void
  onCanvasDrop: (event: ReactDragEvent<HTMLDivElement>) => void
}

export function FlowCanvas({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  gridEnabled,
  onConnect,
  onNodesChange,
  onEdgesChange,
  onPaneClick,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onEdgeDoubleClick,
  onCanvasDragOver,
  onCanvasDrop
}: FlowCanvasProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-0 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] shadow-sm backdrop-blur-xl">
      <div
        data-testid="flow-canvas-dropzone"
        className="h-full bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.1),transparent_30%)]"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <ReactFlow
          fitView
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable
          panOnDrag
          panOnScroll
          zoomOnScroll
          snapToGrid={gridEnabled}
          snapGrid={SNAP_GRID}
          proOptions={{ hideAttribution: true }}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick}
          onNodeClick={(_, node) => onNodeClick(node.id)}
          onNodeDoubleClick={(_, node) => onNodeDoubleClick(node.id)}
          onEdgeClick={(_, edge) => onEdgeClick(edge.id)}
          onEdgeDoubleClick={(_, edge) => onEdgeDoubleClick(edge.id)}
        >
          {gridEnabled ? <Background color="hsl(var(--border))" gap={24} variant={BackgroundVariant.Lines} /> : null}
          <Controls showInteractive={false} position="top-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            className="!h-32 !w-52 !rounded-2xl !border !border-[hsl(var(--border))] !bg-[var(--card-surface)]"
            nodeStrokeColor={() => 'hsl(var(--primary))'}
            nodeColor={() => 'color-mix(in_hsl,hsl(var(--primary))_18%,white)'}
          />
          <Panel position="top-right">
            <div className="meta-text rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] px-3 py-1.5 shadow-sm backdrop-blur-xl">
              {t('flowEditor.editor.canvasHint')}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
