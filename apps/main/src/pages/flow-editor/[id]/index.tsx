import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent
} from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type XYPosition
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useNavigate, useParams } from 'react-router-dom'
import { cn, toast } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { fetchFlowDetail, saveFlowDetail, type FlowDocument, type FlowNodeKind } from '../../../services/mockApi'
import { nodeMeta } from './constants'
import { FlowEditorActionsContext } from './context'
import { FlowCanvas } from './components/FlowCanvas'
import { FlowDeleteDialog } from './components/FlowDeleteDialog'
import { FlowEditorToolbar } from './components/FlowEditorToolbar'
import { FlowEdgeRenderer } from './components/FlowEdgeRenderer'
import { FlowInspectorPanel } from './components/FlowInspectorPanel'
import { FlowMobilePanels } from './components/FlowMobilePanels'
import { FlowNodePalette } from './components/FlowNodePalette'
import { FlowNodeCard } from './components/FlowNodeCard'
import { cloneEdges, cloneNodes, createNode, getEdgeStyle, normalizeEdge, shouldRecordEdgeChangeHistory, shouldRecordNodeChangeHistory } from './utils'
import type { DeleteTarget, FlowEdge, FlowEditorActions, FlowNode, FlowNodeData, FlowSelectionSummary } from './types'
import { useFlowHistory } from './useFlowHistory'
import { useFlowKeyboardShortcuts } from './useFlowKeyboardShortcuts'

function FlowEditorPageInner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = 'new' } = useParams()
  const { screenToFlowPosition, fitView } = useReactFlow<FlowNode, FlowEdge>()
  const [flowDocument, setFlowDocument] = useState<FlowDocument | null>(null)
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<FlowEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [gridEnabled, setGridEnabled] = useState(true)
  const [propertyOpen, setPropertyOpen] = useState(false)
  const [edgePanelOpen, setEdgePanelOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [clipboardNode, setClipboardNode] = useState<FlowNode | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const initializedRef = useRef(false)
  const dirty = initializedRef.current && JSON.stringify({ nodes, edges }) !== savedSnapshot
  const { canUndo, canRedo, initializeHistory, recordSnapshot, undo, redo } = useFlowHistory()

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId])
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId])

  const applyState = useCallback((nextNodes: FlowNode[], nextEdges: FlowEdge[], recordHistory = true) => {
    const nodesSnapshot = cloneNodes(nextNodes)
    const edgesSnapshot = cloneEdges(nextEdges)
    setNodes(nodesSnapshot)
    setEdges(edgesSnapshot)

    if (!recordHistory) {
      return
    }

    recordSnapshot(nodesSnapshot, edgesSnapshot)
  }, [recordSnapshot])

  useEffect(() => {
    let active = true
    void fetchFlowDetail(id).then((payload) => {
      if (!active) {
        return
      }

      const normalizedNodes = payload.nodes.map((node) => ({ ...node, data: node.data as FlowNodeData })) as FlowNode[]
      const normalizedEdges = payload.edges.map((edge) => normalizeEdge(edge as FlowEdge))
      const snapshot = JSON.stringify({ nodes: normalizedNodes, edges: normalizedEdges })
      initializedRef.current = true
      setFlowDocument(payload)
      setNodes(cloneNodes(normalizedNodes))
      setEdges(cloneEdges(normalizedEdges))
      initializeHistory({ nodes: cloneNodes(normalizedNodes), edges: cloneEdges(normalizedEdges) })
      setSavedSnapshot(snapshot)
      window.setTimeout(() => void fitView({ duration: 250, padding: 0.2 }), 50)
    })

    return () => {
      active = false
    }
  }, [fitView, id, initializeHistory])

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null)
    }
  }, [edges, selectedEdgeId])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const addNode = useCallback((kind: FlowNodeKind, position?: XYPosition) => {
    const nextPosition = position ?? { x: 180 + nodes.length * 28, y: 120 + (nodes.length % 5) * 92 }
    if (kind === 'start' && nodes.some((node) => node.data.kind === 'start')) {
      toast.error(t('flowEditor.editor.startNodeUnique'))
      return
    }

    const nextNode = createNode(kind, nextPosition)
    const nextNodes = [...nodes, nextNode]
    applyState(nextNodes, edges)
    setSelectedNodeId(nextNode.id)
    setSelectedEdgeId(null)
  }, [applyState, edges, nodes, t])

  const duplicateNode = useCallback((nodeId: string) => {
    const source = nodes.find((node) => node.id === nodeId)
    if (!source) {
      return
    }
    if (source.data.kind === 'start' && nodes.some((node) => node.data.kind === 'start' && node.id !== nodeId)) {
      toast.error(t('flowEditor.editor.startNodeDuplicateBlocked'))
      return
    }

    const duplicated = createNode(source.data.kind, { x: source.position.x + 48, y: source.position.y + 48 }, source.data)
    const nextNodes = [...nodes, duplicated]
    applyState(nextNodes, edges)
    setSelectedNodeId(duplicated.id)
    setSelectedEdgeId(null)
  }, [applyState, edges, nodes, t])

  const requestDelete = useCallback((target: DeleteTarget) => {
    setDeleteTarget(target)
    setDeleteDialogOpen(Boolean(target))
  }, [])

  const openNodeEditor = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    setInspectorCollapsed(false)
    if (window.matchMedia('(max-width: 1279px)').matches) {
      setPropertyOpen(true)
    }
  }, [])

  const openEdgeEditor = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId)
    setSelectedNodeId(null)
    setInspectorCollapsed(false)
    if (window.matchMedia('(max-width: 1279px)').matches) {
      setEdgePanelOpen(true)
    }
  }, [])

  const editorActions = useMemo<FlowEditorActions>(() => ({
    hoveredNodeId,
    hoveredEdgeId,
    openNodeEditor,
    openEdgeEditor,
    duplicateNode,
    requestDelete,
    selectNode: setSelectedNodeId,
    selectEdge: setSelectedEdgeId,
    setHoveredNode: setHoveredNodeId,
    setHoveredEdge: setHoveredEdgeId,
  }), [duplicateNode, hoveredEdgeId, hoveredNodeId, openEdgeEditor, openNodeEditor, requestDelete])

  const saveSnapshot = async () => {
    if (!flowDocument) {
      return
    }

    const payload: FlowDocument = {
      ...flowDocument,
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges).map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: getEdgeStyle(edge.data?.lineStyle ?? 'solid'),
        type: 'flowEdge'
      }))
    }

    const saved = await saveFlowDetail(payload)
    setFlowDocument(saved)
    setSavedSnapshot(JSON.stringify({ nodes, edges }))
    toast.success(t('flowEditor.editor.saveSuccess'))
  }

  const restoreSaved = () => {
    if (!savedSnapshot) {
      return
    }

    const parsed = JSON.parse(savedSnapshot) as { nodes: FlowNode[]; edges: FlowEdge[] }
    applyState(parsed.nodes, parsed.edges)
    toast.success(t('flowEditor.editor.restoreSuccess'))
  }

  const onNodesChange = (changes: NodeChange[]) => {
    applyState(applyNodeChanges(changes, nodes) as FlowNode[], edges, shouldRecordNodeChangeHistory(changes))
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    applyState(nodes, applyEdgeChanges(changes, edges) as FlowEdge[], shouldRecordEdgeChangeHistory(changes))
  }

  const onConnect = (connection: Connection) => {
    const edge: FlowEdge = normalizeEdge({
      ...connection,
      id: `edge-${Date.now()}`,
      label: 'flowEditor.editor.defaultEdgePath',
      data: { condition: 'flowEditor.editor.defaultEdgePath', lineStyle: 'solid' }
    } as FlowEdge)
    applyState(nodes, addEdge(edge, edges) as FlowEdge[])
  }

  const updateNodeData = (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
    applyState(nodes.map((node) => (node.id === nodeId ? updater(node) : node)), edges)
  }

  const updateEdgeData = (edgeId: string, updater: (edge: FlowEdge) => FlowEdge) => {
    applyState(nodes, edges.map((edge) => (edge.id === edgeId ? normalizeEdge(updater(edge)) : edge)))
  }

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }

    if (deleteTarget.type === 'node') {
      const nextNodes = nodes.filter((node) => node.id !== deleteTarget.id)
      const nextEdges = edges.filter((edge) => edge.source !== deleteTarget.id && edge.target !== deleteTarget.id)
      applyState(nextNodes, nextEdges)
      setSelectedNodeId(null)
    } else {
      applyState(nodes, edges.filter((edge) => edge.id !== deleteTarget.id))
      setSelectedEdgeId(null)
    }

    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const handleUndo = useCallback(() => {
    const snapshot = undo()
    if (!snapshot) {
      return
    }

    setNodes(cloneNodes(snapshot.nodes))
    setEdges(cloneEdges(snapshot.edges))
  }, [undo])

  const handleRedo = useCallback(() => {
    const snapshot = redo()
    if (!snapshot) {
      return
    }

    setNodes(cloneNodes(snapshot.nodes))
    setEdges(cloneEdges(snapshot.edges))
  }, [redo])

  useFlowKeyboardShortcuts({
    t,
    selectedNode,
    clipboardNode,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    setClipboardNode,
    applyState,
    setSelectedNodeId,
    handleUndo,
    handleRedo,
    requestDelete
  })

  const onPaletteDragStart = (event: ReactDragEvent<HTMLButtonElement>, kind: FlowNodeKind) => {
    event.dataTransfer.setData('application/x-flow-node', kind)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const onCanvasDrop = (event: DragEvent) => {
    event.preventDefault()
    const kind = event.dataTransfer?.getData('application/x-flow-node') as FlowNodeKind | ''
    if (!kind) {
      return
    }
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY }) ?? { x: 0, y: 0 }
    addNode(kind, position)
  }

  const onCanvasDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  const nodeTypes = useMemo<NodeTypes>(() => ({
    start: FlowNodeCard,
    end: FlowNodeCard,
    task: FlowNodeCard,
    condition: FlowNodeCard,
    parallel: FlowNodeCard,
    loop: FlowNodeCard
  }), [])

  const edgeTypes = useMemo<EdgeTypes>(() => ({ flowEdge: FlowEdgeRenderer }), [])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...flowDocument, nodes, edges }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `${flowDocument?.name ?? 'flow'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const activeSummary: FlowSelectionSummary | null = selectedNode
    ? { title: t(selectedNode.data.label), description: t(selectedNode.data.description), type: t(nodeMeta[selectedNode.data.kind].labelKey) }
    : selectedEdge
      ? {
          title: t(selectedEdge.data?.condition ?? 'flowEditor.editor.edge'),
          description: t(selectedEdge.label?.toString() ?? 'flowEditor.editor.pathConfig'),
          type: t('flowEditor.editor.edge')
        }
      : null
  const inspectorHandleLabel = activeSummary?.type ?? t('flowEditor.editor.properties')

  const navigateBackWithGuard = () => {
    if (dirty && !window.confirm(t('flowEditor.editor.leaveConfirm'))) {
      return
    }

    navigate('/flow-editor')
  }

  return (
    <FlowEditorActionsContext.Provider value={editorActions}>
      <div className="flex h-[calc(100vh-10rem)] min-h-[40rem] flex-col gap-3">
        <FlowEditorToolbar
          flowName={flowDocument?.name ?? t('flowEditor.editTitle')}
          dirty={dirty}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          gridEnabled={gridEnabled}
          setGridEnabled={setGridEnabled}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onRestore={restoreSaved}
          onExportJson={exportJson}
          onOpenProperties={() => {
            if (selectedEdge) {
              setEdgePanelOpen(true)
              return
            }
            setPropertyOpen(true)
          }}
          onSave={() => void saveSnapshot()}
          onBack={navigateBackWithGuard}
        />

        <div className="relative min-h-0 flex-1">
          <div className={cn('grid min-h-0 h-full gap-3', inspectorCollapsed ? 'xl:grid-cols-[15rem_minmax(0,1fr)]' : 'xl:grid-cols-[15rem_minmax(0,1fr)_22rem]')}>
            <FlowNodePalette onPaletteDragStart={onPaletteDragStart} onAddNode={addNode} />

            <FlowCanvas
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              gridEnabled={gridEnabled}
              onConnect={onConnect}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onPaneClick={() => {
                setSelectedNodeId(null)
                setSelectedEdgeId(null)
              }}
              onNodeClick={(nodeId) => {
                setSelectedNodeId(nodeId)
                setSelectedEdgeId(null)
              }}
              onNodeDoubleClick={openNodeEditor}
              onEdgeClick={(edgeId) => {
                setSelectedEdgeId(edgeId)
                setSelectedNodeId(null)
              }}
              onEdgeDoubleClick={openEdgeEditor}
              onCanvasDragOver={onCanvasDragOver}
              onCanvasDrop={onCanvasDrop}
            />

            <FlowInspectorPanel
              inspectorCollapsed={inspectorCollapsed}
              inspectorHandleLabel={inspectorHandleLabel}
              flowDocument={flowDocument}
              nodeCount={nodes.length}
              edgeCount={edges.length}
              activeSummary={activeSummary}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              nodes={nodes}
              updateNodeData={updateNodeData}
              updateEdgeData={updateEdgeData}
              onToggleCollapsed={() => setInspectorCollapsed((value) => !value)}
            />
          </div>
        </div>

        <FlowMobilePanels
          propertyOpen={propertyOpen}
          setPropertyOpen={setPropertyOpen}
          edgePanelOpen={edgePanelOpen}
          setEdgePanelOpen={setEdgePanelOpen}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodes={nodes}
          updateNodeData={updateNodeData}
          updateEdgeData={updateEdgeData}
        />

        <FlowDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) {
              setDeleteTarget(null)
            }
          }}
          onConfirm={confirmDelete}
        />
      </div>
    </FlowEditorActionsContext.Provider>
  )
}

export default function FlowEditorEditPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorPageInner />
    </ReactFlowProvider>
  )
}
