import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction
} from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  MiniMap,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type XYPosition
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  Flag,
  GitBranch,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
  SplitSquareVertical,
  Trash2,
  Workflow
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
  cn,
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { fetchFlowDetail, saveFlowDetail, type FlowDocument, type FlowNodeKind } from '../../../services/mockApi'

interface FlowNodeData extends Record<string, unknown> {
  label: string
  description: string
  kind: FlowNodeKind
  config: Record<string, string>
}

interface FlowEdgeData extends Record<string, unknown> {
  condition: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
}

type FlowNode = Node<FlowNodeData>
type FlowEdge = Edge<FlowEdgeData>

type DeleteTarget = { type: 'node' | 'edge'; id: string } | null

interface FlowEditorActions {
  hoveredNodeId: string | null
  hoveredEdgeId: string | null
  openNodeEditor: (nodeId: string) => void
  openEdgeEditor: (edgeId: string) => void
  duplicateNode: (nodeId: string) => void
  requestDelete: (target: DeleteTarget) => void
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  setHoveredNode: Dispatch<SetStateAction<string | null>>
  setHoveredEdge: Dispatch<SetStateAction<string | null>>
}

const FlowEditorActionsContext = createContext<FlowEditorActions | null>(null)

const nodeMeta: Record<FlowNodeKind, { labelKey: string; icon: typeof Play; accent: string; chip: string }> = {
  start: { labelKey: 'flowEditor.editor.nodeTypes.start', icon: Play, accent: 'from-emerald-400 to-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  end: { labelKey: 'flowEditor.editor.nodeTypes.end', icon: Flag, accent: 'from-rose-400 to-rose-500', chip: 'bg-rose-100 text-rose-700' },
  task: { labelKey: 'flowEditor.editor.nodeTypes.task', icon: Workflow, accent: 'from-sky-400 to-cyan-500', chip: 'bg-sky-100 text-sky-700' },
  condition: { labelKey: 'flowEditor.editor.nodeTypes.condition', icon: GitBranch, accent: 'from-amber-400 to-orange-500', chip: 'bg-amber-100 text-amber-700' },
  parallel: { labelKey: 'flowEditor.editor.nodeTypes.parallel', icon: SplitSquareVertical, accent: 'from-violet-400 to-indigo-500', chip: 'bg-violet-100 text-violet-700' },
  loop: { labelKey: 'flowEditor.editor.nodeTypes.loop', icon: Repeat, accent: 'from-fuchsia-400 to-pink-500', chip: 'bg-fuchsia-100 text-fuchsia-700' }
}

const defaultNodeConfig: Record<FlowNodeKind, Record<string, string>> = {
  start: { trigger: 'manual' },
  end: { result: 'done' },
  task: { executor: 'service', timeout: '30s' },
  condition: { expression: 'payload.ok === true' },
  parallel: { branches: '2' },
  loop: { limit: '3', interval: '1m' }
}

const paletteGroups: Array<{ id: string; titleKey: string; descriptionKey: string; kinds: FlowNodeKind[] }> = [
  { id: 'basic', titleKey: 'flowEditor.editor.paletteGroups.basic.title', descriptionKey: 'flowEditor.editor.paletteGroups.basic.description', kinds: ['start', 'end'] },
  { id: 'logic', titleKey: 'flowEditor.editor.paletteGroups.logic.title', descriptionKey: 'flowEditor.editor.paletteGroups.logic.description', kinds: ['condition', 'parallel', 'loop'] },
  { id: 'execution', titleKey: 'flowEditor.editor.paletteGroups.execution.title', descriptionKey: 'flowEditor.editor.paletteGroups.execution.description', kinds: ['task'] }
]

function useFlowEditorActions() {
  const context = useContext(FlowEditorActionsContext)
  if (!context) {
    throw new Error('Flow editor actions are unavailable')
  }

  return context
}

function getEdgeStyle(lineStyle: FlowEdgeData['lineStyle']) {
  if (lineStyle === 'dashed') {
    return { strokeDasharray: '8 6' }
  }

  if (lineStyle === 'dotted') {
    return { strokeDasharray: '2 6' }
  }

  return undefined
}

function normalizeEdge(edge: FlowEdge): FlowEdge {
  return {
    ...edge,
    type: 'flowEdge',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: edge.data ?? { condition: edge.label?.toString() ?? 'flowEditor.editor.defaultEdgePath', lineStyle: 'solid' },
    style: getEdgeStyle(edge.data?.lineStyle ?? 'solid')
  }
}

function cloneNodes(nodes: FlowNode[]) {
  return structuredClone(nodes)
}

function cloneEdges(edges: FlowEdge[]) {
  return structuredClone(edges)
}

function createFlowStateSnapshot(nodes: FlowNode[], edges: FlowEdge[]) {
  return {
    nodes: cloneNodes(nodes),
    edges: cloneEdges(edges)
  }
}

function shouldRecordNodeChangeHistory(changes: NodeChange[]) {
  return changes.some((change) => {
    if (change.type === 'select' || change.type === 'dimensions') {
      return false
    }

    if (change.type === 'position') {
      return change.dragging === false
    }

    return true
  })
}

function shouldRecordEdgeChangeHistory(changes: EdgeChange[]) {
  return changes.some((change) => change.type !== 'select')
}

export function flowEditorTestUtils() {
  return {
    createNode,
    normalizeEdge,
    createFlowStateSnapshot,
    getEdgeStyle,
    shouldRecordNodeChangeHistory,
    shouldRecordEdgeChangeHistory
  }
}

function useFloatingToolbarVisibility(
  id: string,
  selected: boolean,
  activeId: string | null,
  setActive: Dispatch<SetStateAction<string | null>>
) {
  const [hovered, setHovered] = useState(false)
  const hideTimerRef = useRef<number | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    clearHideTimer()
    setHovered(true)
    setActive(id)
  }, [clearHideTimer, id, setActive])

  const hide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      setActive((current) => (current === id ? null : current) as never)
    }, 160)
  }, [clearHideTimer, id, setActive])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  return {
    showToolbar: hovered || selected || activeId === id,
    show,
    hide
  }
}

function createNode(kind: FlowNodeKind, position: XYPosition, seed?: Partial<FlowNodeData>): FlowNode {
  const meta = nodeMeta[kind]
  return {
    id: `${kind}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: kind,
    position,
    data: {
      label: seed?.label ?? meta.labelKey,
      description: seed?.description ?? 'flowEditor.editor.defaultNodeDescription',
      kind,
      config: { ...defaultNodeConfig[kind], ...(seed?.config ?? {}) }
    }
  }
}

function FlowNodeCard({ id, data, selected }: NodeProps<FlowNode>) {
  const { t } = useTranslation()
  const actions = useFlowEditorActions()
  const meta = nodeMeta[data.kind]
  const Icon = meta.icon
  const { showToolbar, show, hide } = useFloatingToolbarVisibility(id, selected, actions.hoveredNodeId, actions.setHoveredNode)
  const allowTarget = data.kind !== 'start'
  const allowSource = data.kind !== 'end'
  const stopToolbarEvent = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      data-testid={`flow-node-${id}`}
      className={`relative min-w-[12rem] rounded-xl border bg-[var(--card-surface)] p-3 shadow-lg backdrop-blur-xl transition ${selected ? 'border-[hsl(var(--primary))] ring-2 ring-[color-mix(in_hsl,hsl(var(--primary))_24%,transparent)]' : 'border-white/40'}`}
      onClick={(event) => {
        event.stopPropagation()
        actions.selectNode(id)
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        actions.openNodeEditor(id)
      }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {allowTarget ? <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-[hsl(var(--primary))]" /> : null}
      {allowSource ? <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-[hsl(var(--primary))]" /> : null}
      <NodeToolbar isVisible={showToolbar} position={Position.Top} offset={10}>
        <div
          data-testid={`node-toolbar-${id}`}
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 shadow-md backdrop-blur-xl"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <Button
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event) => {
              stopToolbarEvent(event)
              actions.openNodeEditor(id)
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event) => {
              stopToolbarEvent(event)
              actions.duplicateNode(id)
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event) => {
              stopToolbarEvent(event)
              actions.requestDelete({ type: 'node', id })
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </NodeToolbar>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white shadow-sm`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{t(data.label)}</div>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{t(data.description)}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className={`rounded-full px-2 py-1 font-medium ${meta.chip}`}>{t(meta.labelKey)}</span>
        <span>{t('flowEditor.editor.configCount', { count: Object.keys(data.config).length })}</span>
      </div>
    </div>
  )
}

function FlowEdgeRenderer(props: EdgeProps<FlowEdge>) {
  const { t } = useTranslation()
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, data, selected, label } = props
  const actions = useFlowEditorActions()
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  })
  const { showToolbar, show, hide } = useFloatingToolbarVisibility(id, selected ?? false, actions.hoveredEdgeId, actions.setHoveredEdge)
  const stopToolbarEvent = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const openEditor = (event?: ReactMouseEvent | MouseEvent) => {
    event?.stopPropagation()
    actions.openEdgeEditor(id)
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        data-testid={`edge-hitbox-${id}`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation()
          actions.selectEdge(id)
        }}
        onDoubleClick={openEditor}
        onMouseEnter={show}
        onMouseLeave={hide}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button
              data-testid={`edge-label-${id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-xl ${selected ? 'border-[hsl(var(--primary))] bg-[color-mix(in_hsl,hsl(var(--primary))_14%,white)] text-foreground' : 'border-[hsl(var(--border))] bg-[var(--card-surface)] text-muted-foreground'}`}
              onClick={(event) => {
                event.stopPropagation()
                actions.selectEdge(id)
              }}
              onDoubleClick={openEditor}
              onMouseEnter={show}
              onMouseLeave={hide}
              type="button"
            >
              {t(data?.condition ?? label?.toString() ?? 'flowEditor.editor.defaultEdgePath')}
            </button>
            {showToolbar ? (
              <div
                data-testid={`edge-toolbar-${id}`}
                className="pointer-events-auto flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 shadow-md backdrop-blur-xl"
                onMouseEnter={show}
                onMouseLeave={hide}
              >
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                    stopToolbarEvent(event)
                    actions.openEdgeEditor(id)
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                    stopToolbarEvent(event)
                    actions.requestDelete({ type: 'edge', id })
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

function FlowEditorPageInner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = 'new' } = useParams()
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null)
  const historyIndexRef = useRef(-1)
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
  const [history, setHistory] = useState<Array<{ nodes: FlowNode[]; edges: FlowEdge[] }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [dirty, setDirty] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const initializedRef = useRef(false)

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId])
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId])
  const canUndo = historyIndex > 0
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1

  const applyState = useCallback((nextNodes: FlowNode[], nextEdges: FlowEdge[], recordHistory = true) => {
    const nodesSnapshot = cloneNodes(nextNodes)
    const edgesSnapshot = cloneEdges(nextEdges)
    setNodes(nodesSnapshot)
    setEdges(edgesSnapshot)

    if (!recordHistory) {
      return
    }

    setHistory((current) => {
      const base = current.slice(0, historyIndexRef.current + 1)
      const next = [...base, { nodes: cloneNodes(nodesSnapshot), edges: cloneEdges(edgesSnapshot) }].slice(-50)
      historyIndexRef.current = next.length - 1
      setHistoryIndex(historyIndexRef.current)
      return next
    })
  }, [])

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
      historyIndexRef.current = 0
      setFlowDocument(payload)
      setNodes(cloneNodes(normalizedNodes))
      setEdges(cloneEdges(normalizedEdges))
      setHistory([{ nodes: cloneNodes(normalizedNodes), edges: cloneEdges(normalizedEdges) }])
      setHistoryIndex(0)
      setSavedSnapshot(snapshot)
      setDirty(false)
      window.setTimeout(() => void fitView({ duration: 250, padding: 0.2 }), 50)
    })

    return () => {
      active = false
    }
  }, [fitView, id])

  useEffect(() => {
    if (!initializedRef.current) {
      return
    }

    setDirty(JSON.stringify({ nodes, edges }) !== savedSnapshot)
  }, [edges, nodes, savedSnapshot])

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
  }, [applyState, edges, nodes])

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
  }, [applyState, edges, nodes])

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
    setDirty(false)
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

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) {
      return
    }

    const nextIndex = historyIndexRef.current - 1
    historyIndexRef.current = nextIndex
    setHistoryIndex(nextIndex)
    const snapshot = history[nextIndex]
    if (snapshot) {
      setNodes(cloneNodes(snapshot.nodes))
      setEdges(cloneEdges(snapshot.edges))
    }
  }, [history])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= history.length - 1) {
      return
    }

    const nextIndex = historyIndexRef.current + 1
    historyIndexRef.current = nextIndex
    setHistoryIndex(nextIndex)
    const snapshot = history[nextIndex]
    if (snapshot) {
      setNodes(cloneNodes(snapshot.nodes))
      setEdges(cloneEdges(snapshot.edges))
    }
  }, [history])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }

      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }

      if (meta && event.key.toLowerCase() === 'c' && selectedNode) {
        event.preventDefault()
        setClipboardNode(structuredClone(selectedNode))
        toast.success(t('flowEditor.editor.nodeCopied'))
      }

      if (meta && event.key.toLowerCase() === 'v' && clipboardNode) {
        event.preventDefault()
        if (clipboardNode.data.kind === 'start' && nodes.some((node) => node.data.kind === 'start')) {
          toast.error(t('flowEditor.editor.startNodeSinglePreserved'))
          return
        }
        const pasted = createNode(clipboardNode.data.kind, { x: clipboardNode.position.x + 56, y: clipboardNode.position.y + 56 }, clipboardNode.data)
        applyState([...nodes, pasted], edges)
        setSelectedNodeId(pasted.id)
      }

      if (event.key === 'Delete') {
        if (selectedNodeId) {
          requestDelete({ type: 'node', id: selectedNodeId })
        } else if (selectedEdgeId) {
          requestDelete({ type: 'edge', id: selectedEdgeId })
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [applyState, clipboardNode, edges, nodes, redo, requestDelete, selectedEdgeId, selectedNode, selectedNodeId, undo])

  const onPaletteDragStart = (event: ReactDragEvent<HTMLButtonElement>, kind: FlowNodeKind) => {
    event.dataTransfer.setData('application/x-flow-node', kind)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const onCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const kind = event.dataTransfer.getData('application/x-flow-node') as FlowNodeKind | ''
    if (!kind) {
      return
    }
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNode(kind, position)
  }

  const onCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
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

  const activeSummary = selectedNode
    ? { title: t(selectedNode.data.label), description: t(selectedNode.data.description), type: t(nodeMeta[selectedNode.data.kind].labelKey) }
    : selectedEdge
      ? {
          title: t(selectedEdge.data?.condition ?? 'flowEditor.editor.edge'),
          description: t(selectedEdge.label?.toString() ?? 'flowEditor.editor.pathConfig'),
          type: t('flowEditor.editor.edge')
        }
      : null
  const inspectorHandleLabel = activeSummary?.type ?? t('flowEditor.editor.properties')

  const renderNodeInspector = () => {
    if (!selectedNode) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.nodeFields.name')}</Label>
          <Input value={selectedNode.data.label} onChange={(event) => updateNodeData(selectedNode.id, (node) => ({ ...node, data: { ...node.data, label: event.target.value } }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.nodeFields.description')}</Label>
          <Textarea value={selectedNode.data.description} onChange={(event) => updateNodeData(selectedNode.id, (node) => ({ ...node, data: { ...node.data, description: event.target.value } }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.nodeFields.type')}</Label>
          <Select
            value={selectedNode.data.kind}
            onValueChange={(value) => {
              if (value === 'start') {
                const startNodes = nodes.filter((node) => node.data.kind === 'start' && node.id !== selectedNode.id)
                if (startNodes.length > 0) {
                  toast.error(t('flowEditor.editor.startNodeSwitchBlocked'))
                  return
                }
              }

              updateNodeData(selectedNode.id, (node) => ({
                ...node,
                type: value,
                data: {
                  ...node.data,
                  kind: value as FlowNodeKind,
                  config: { ...defaultNodeConfig[value as FlowNodeKind], ...node.data.config }
                }
              }))
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(nodeMeta).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t(nodeMeta[kind as FlowNodeKind].labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {Object.entries(selectedNode.data.config).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <Label>{key}</Label>
            <Input value={value} onChange={(event) => updateNodeData(selectedNode.id, (node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, [key]: event.target.value } } }))} />
          </div>
        ))}
      </div>
    )
  }

  const renderEdgeInspector = () => {
    if (!selectedEdge) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.edgeFields.label')}</Label>
          <Input value={selectedEdge.label?.toString() ?? ''} onChange={(event) => updateEdgeData(selectedEdge.id, (edge) => ({ ...edge, label: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.edgeFields.condition')}</Label>
          <Textarea value={selectedEdge.data?.condition ?? ''} onChange={(event) => updateEdgeData(selectedEdge.id, (edge) => ({ ...edge, data: { condition: event.target.value, lineStyle: edge.data?.lineStyle ?? 'solid' } }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('flowEditor.editor.edgeFields.style')}</Label>
          <Select
            value={selectedEdge.data?.lineStyle ?? 'solid'}
            onValueChange={(value) => updateEdgeData(selectedEdge.id, (edge) => ({
              ...edge,
              data: { condition: edge.data?.condition ?? '', lineStyle: value as FlowEdgeData['lineStyle'] },
              style: getEdgeStyle(value as FlowEdgeData['lineStyle'])
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">{t('flowEditor.editor.edgeStyles.solid')}</SelectItem>
              <SelectItem value="dashed">{t('flowEditor.editor.edgeStyles.dashed')}</SelectItem>
              <SelectItem value="dotted">{t('flowEditor.editor.edgeStyles.dotted')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  const navigateBackWithGuard = () => {
    if (dirty && !window.confirm(t('flowEditor.editor.leaveConfirm'))) {
      return
    }

    navigate('/flow-editor')
  }

  return (
    <FlowEditorActionsContext.Provider value={editorActions}>
      <div className="flex h-[calc(100vh-10rem)] min-h-[40rem] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] px-3 py-2 shadow-sm backdrop-blur-xl">
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={navigateBackWithGuard}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{flowDocument?.name ?? t('flowEditor.editTitle')}</div>
              <div className="meta-text flex flex-wrap items-center gap-2">
                <Badge variant={dirty ? 'warning' : 'success'}>{dirty ? t('flowEditor.editor.unsaved') : t('flowEditor.editor.saved')}</Badge>
                <span>{t('flowEditor.editor.nodeCount', { count: nodes.length })}</span>
                <span>{t('flowEditor.editor.edgeCount', { count: edges.length })}</span>
              </div>
            </div>
          </div>
          <div className="meta-text flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5">
            <span>{t('flowEditor.editor.grid')}</span>
            <Switch checked={gridEnabled} onCheckedChange={setGridEnabled} />
          </div>
          <Button variant="outline" disabled={!canUndo} onClick={undo}>
            <RotateCcw className="size-4" />
            {t('flowEditor.editor.undo')}
          </Button>
          <Button variant="outline" disabled={!canRedo} onClick={redo}>
            <RotateCw className="size-4" />
            {t('flowEditor.editor.redo')}
          </Button>
          <Button variant="outline" onClick={restoreSaved}>
            <Download className="size-4" />
            {t('flowEditor.editor.restore')}
          </Button>
          <Button variant="outline" onClick={exportJson}>
            <FileJson className="size-4" />
            JSON
          </Button>
          <Button variant="outline" className="xl:hidden" onClick={() => {
            if (selectedEdge) {
              setEdgePanelOpen(true)
              return
            }
            setPropertyOpen(true)
          }}>
            <Settings2 className="size-4" />
            {t('flowEditor.editor.properties')}
          </Button>
          <Button onClick={() => void saveSnapshot()}>
            <Save className="size-4" />
            {t('flowEditor.editor.save')}
          </Button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className={cn('grid min-h-0 h-full gap-3', inspectorCollapsed ? 'xl:grid-cols-[15rem_minmax(0,1fr)]' : 'xl:grid-cols-[15rem_minmax(0,1fr)_22rem]')}>
            <Card className="theme-card min-h-0 overflow-hidden shadow-sm">
              <CardContent className="flex h-full min-h-0 flex-col p-0">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t('flowEditor.editor.nodeLibrary')}</div>
                    <div className="meta-text">{t('flowEditor.editor.nodeLibraryHint')}</div>
                  </div>
                  <Badge variant="outline">{paletteGroups.reduce((count, group) => count + group.kinds.length, 0)}</Badge>
                </div>
                <ScrollArea className="min-h-0 flex-1 px-3 py-3">
                  <div className="space-y-3">
                    {paletteGroups.map((group) => (
                      <section key={group.id} className="rounded-lg border border-[hsl(var(--border))] bg-white/45 p-2.5 dark:bg-slate-900/25">
                        <div className="eyebrow-text mb-2 px-1 text-muted-foreground">{t(group.titleKey)}</div>
                        <div className="grid gap-2">
                          {group.kinds.map((kind) => {
                            const meta = nodeMeta[kind]
                            const Icon = meta.icon
                            return (
                              <div key={kind} className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white/70 p-2 shadow-xs dark:bg-slate-950/35">
                                <button
                                  data-testid={`palette-item-${kind}`}
                                  className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                                  draggable
                                  onDragStart={(event) => onPaletteDragStart(event, kind)}
                                  type="button"
                                >
                                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.accent} text-white`}>
                                    <Icon className="size-4" />
                                  </span>
                                  <span className="truncate text-sm font-medium text-foreground">{t(meta.labelKey)}</span>
                                </button>
                                <Button size="icon-sm" variant="ghost" onClick={() => addNode(kind)}>
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="min-h-0 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] shadow-sm backdrop-blur-xl">
              <div
                ref={reactFlowWrapperRef}
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
                  snapGrid={[24, 24]}
                  proOptions={{ hideAttribution: true }}
                  onConnect={onConnect}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onPaneClick={() => {
                    setSelectedNodeId(null)
                    setSelectedEdgeId(null)
                  }}
                  onNodeClick={(_, node) => {
                    setSelectedNodeId(node.id)
                    setSelectedEdgeId(null)
                  }}
                  onNodeDoubleClick={(_, node) => openNodeEditor(node.id)}
                  onEdgeClick={(_, edge) => {
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                  }}
                  onEdgeDoubleClick={(_, edge) => openEdgeEditor(edge.id)}
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
                          <span>{t('flowEditor.editor.nodeCount', { count: nodes.length })}</span>
                          <span>{t('flowEditor.editor.edgeCount', { count: edges.length })}</span>
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
                        {selectedNode ? renderNodeInspector() : selectedEdge ? renderEdgeInspector() : (
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
          </div>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-0 top-1/2 z-20 hidden h-32 -translate-y-1/2 translate-x-[42%] rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] px-2 py-3 shadow-lg backdrop-blur-xl xl:inline-flex"
            onClick={() => setInspectorCollapsed((value) => !value)}
          >
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm font-medium text-foreground">
              {inspectorCollapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="writing-mode-vertical text-sm tracking-[0.18em] [writing-mode:vertical-rl]">{inspectorHandleLabel}</span>
            </div>
          </Button>
        </div>

        <Sheet open={propertyOpen} onOpenChange={setPropertyOpen}>
            <SheetContent side="right" className="w-[30rem] max-w-[92vw] border-l border-[hsl(var(--border))] bg-background shadow-xl sm:max-w-[30rem]">
              <SheetHeader>
              <SheetTitle>{t('flowEditor.editor.nodeSheetTitle')}</SheetTitle>
              <SheetDescription>{t('flowEditor.editor.nodeSheetDescription')}</SheetDescription>
              </SheetHeader>
            {selectedNode ? <div className="px-4 pb-6">{renderNodeInspector()}</div> : null}
          </SheetContent>
        </Sheet>

        <Sheet open={edgePanelOpen} onOpenChange={setEdgePanelOpen}>
            <SheetContent side="right" className="w-[26rem] max-w-[92vw] border-l border-[hsl(var(--border))] bg-background shadow-xl sm:max-w-[26rem]">
              <SheetHeader>
              <SheetTitle>{t('flowEditor.editor.edgeSheetTitle')}</SheetTitle>
              <SheetDescription>{t('flowEditor.editor.edgeSheetDescription')}</SheetDescription>
              </SheetHeader>
            {selectedEdge ? <div className="px-4 pb-6">{renderEdgeInspector()}</div> : null}
          </SheetContent>
        </Sheet>

        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) {
              setDeleteTarget(null)
            }
          }}
        >
            <DialogContent>
              <DialogHeader>
              <DialogTitle>{t('flowEditor.editor.deleteTitle')}</DialogTitle>
              <DialogDescription>{t('flowEditor.editor.deleteDescription')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  {t('common.delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
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
