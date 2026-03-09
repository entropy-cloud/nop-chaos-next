import { useState, useCallback, useRef, useEffect } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  applyNodeChanges,
  MarkerType,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Save,
  Download,
  Upload,
  Trash2,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Grid3X3,
} from "lucide-react"
import { useThemeStore } from "@/stores/theme"
import { useTranslation } from "react-i18next"

import { FloatingToolbar } from "./components/FloatingToolbar"
import { NodePanel, type NodeTypeInfo } from "./components/NodePanel"
import { PropertyPanel } from "./components/PropertyPanel"
import { NodePropertyDialog } from "./components/NodePropertyDialog"
import { EdgePropertyDialog } from "./components/EdgePropertyDialog"
import { nodeTypesMap } from "./components/CustomNodes"
import type { DragEvent } from "react"

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 100, y: 100 },
    data: { label: "开始", color: "#22c55e" },
    type: "start",
  },
  {
    id: "2",
    position: { x: 300, y: 100 },
    data: { label: "处理数据", color: "#3b82f6" },
    type: "custom",
  },
  {
    id: "3",
    position: { x: 500, y: 100 },
    data: { label: "验证", color: "#eab308" },
    type: "condition",
  },
  {
    id: "4",
    position: { x: 700, y: 50 },
    data: { label: "成功", color: "#22c55e" },
    type: "end",
  },
  {
    id: "5",
    position: { x: 700, y: 150 },
    data: { label: "失败", color: "#ef4444" },
    type: "end",
  },
]

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    label: "是",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    label: "否",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
]

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
}

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  mode: "design" | "preview"
  snapToGrid: boolean
  gridSize: number
  isGlass: boolean
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: import("@xyflow/react").EdgeChange[]) => void
  onConnect: (params: Connection) => void
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void
  onEdgeDoubleClick: (event: React.MouseEvent, edge: Edge) => void
  onPaneClick: () => void
}

function FlowCanvas({
  nodes,
  edges,
  mode,
  snapToGrid,
  gridSize,
  isGlass,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  onPaneClick,
}: FlowCanvasProps) {
  const { t } = useTranslation()
  const reactFlowInstance = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const data = event.dataTransfer.getData("application/reactflow")
      if (!data) return

      const nodeType: NodeTypeInfo = JSON.parse(data)
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${nodeType.type}-${Date.now()}`,
        position,
        data: {
          label: t(nodeType.label),
          labelKey: nodeType.label,
          color: nodeType.color,
          icon: "circle",
        },
        type: nodeType.nodeType || "custom",
      }

      const { addNodes } = reactFlowInstance
      addNodes(newNode)
    },
    [reactFlowInstance, t]
  )

  return (
    <Card
      ref={reactFlowWrapper}
      className={cn("flex-1", isGlass && "glass-card")}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={mode === "design" ? onNodesChange : undefined}
        onEdgesChange={mode === "design" ? onEdgesChange : undefined}
        onConnect={mode === "design" ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDoubleClick={mode === "design" ? onNodeDoubleClick : undefined}
        onEdgeDoubleClick={mode === "design" ? onEdgeDoubleClick : undefined}
        onPaneClick={onPaneClick}
        onDragOver={mode === "design" ? onDragOver : undefined}
        onDrop={mode === "design" ? onDrop : undefined}
        nodeTypes={nodeTypesMap}
        fitView
        nodesDraggable={mode === "design"}
        nodesConnectable={mode === "design"}
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={gridSize} size={1} />
      </ReactFlow>
    </Card>
  )
}

function FlowEditorInternal() {
  const { t } = useTranslation()
  const { style } = useThemeStore()
  const isGlass = style === "glassmorphism"

  const [nodes, setNodesState] = useState<Node[]>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [mode, setMode] = useState<"design" | "preview">("design")
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridSize] = useState(20)

  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [floatingToolbarVisible, setFloatingToolbarVisible] = useState(false)

  const copiedNodesRef = useRef<Node[]>([])

  const historyRef = useRef<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges },
  ])
  const historyIndexRef = useRef(0)
  const isUndoRedoRef = useRef(false)

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    newHistory.push({ nodes: newNodes, edges: newEdges })

    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      historyIndexRef.current++
    }

    historyRef.current = newHistory
  }, [])

  const setNodes = useCallback(
    (nodesOrUpdater: Node[] | ((nodes: Node[]) => Node[])) => {
      setNodesState((prevNodes) => {
        const newNodes =
          typeof nodesOrUpdater === "function"
            ? nodesOrUpdater(prevNodes)
            : nodesOrUpdater
        pushHistory(newNodes, edges)
        return newNodes
      })
    },
    [edges, pushHistory]
  )

  const updateEdgesWithHistory = useCallback(
    (edgesOrUpdater: Edge[] | ((edges: Edge[]) => Edge[])) => {
      setEdges((prevEdges) => {
        const newEdges =
          typeof edgesOrUpdater === "function"
            ? edgesOrUpdater(prevEdges)
            : edgesOrUpdater
        pushHistory(nodes, newEdges)
        return newEdges
      })
    },
    [nodes, pushHistory, setEdges]
  )

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--
      isUndoRedoRef.current = true
      const state = historyRef.current[historyIndexRef.current]
      setNodesState(state.nodes)
      setEdges(state.edges)
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }, [setEdges])

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++
      isUndoRedoRef.current = true
      const state = historyRef.current[historyIndexRef.current]
      setNodesState(state.nodes)
      setEdges(state.edges)
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }, [setEdges])

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds: Node[]) => nds.filter((node: Node) => node.id !== id))
      updateEdgesWithHistory((eds: Edge[]) =>
        eds.filter((edge: Edge) => edge.source !== id && edge.target !== id)
      )
      setSelectedNode(null)
      setNodeDialogOpen(false)
    },
    [setNodes, updateEdgesWithHistory]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "design") return

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdKey = isMac ? e.metaKey : e.ctrlKey

      if (cmdKey && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }

      if (cmdKey && e.key === "y") {
        e.preventDefault()
        redo()
      }

      if (cmdKey && e.key === "c") {
        e.preventDefault()
        if (selectedNode) {
          copiedNodesRef.current = [selectedNode]
          toast.success(t("flow.copyNode"))
        }
      }

      if (cmdKey && e.key === "v") {
        e.preventDefault()
        if (copiedNodesRef.current.length > 0) {
          const newNodes = copiedNodesRef.current.map((node) => ({
            ...node,
            id: `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            position: {
              x: node.position.x + 20,
              y: node.position.y + 20,
            },
            selected: false,
          }))
          setNodes((nds) => [...nds, ...newNodes])
          toast.success(t("flow.pasteNode"))
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        e.preventDefault()
        handleDeleteNode(selectedNode.id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, selectedNode, undo, redo, setNodes, handleDeleteNode])

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `e${params.source}-${params.target}-${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed },
      }
      updateEdgesWithHistory((eds: Edge[]) => addEdge(newEdge, eds))
    },
    [updateEdgesWithHistory]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    [setNodes]
  )

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
    const bounds = (event.target as HTMLElement).getBoundingClientRect()
    setToolbarPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top - 50,
    })
    setFloatingToolbarVisible(true)
  }, [])

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    const bounds = (event.target as HTMLElement).getBoundingClientRect()
    setToolbarPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top - 50,
    })
    setFloatingToolbarVisible(true)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setFloatingToolbarVisible(false)
  }, [])

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
      setNodeDialogOpen(true)
    },
    []
  )

  const handleEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge)
      setEdgeDialogOpen(true)
    },
    []
  )

  const getEdgeStyle = useCallback((lineStyle?: string) => {
    switch (lineStyle) {
      case "dashed":
        return { strokeDasharray: "5,5" }
      case "dotted":
        return { strokeDasharray: "2,2" }
      default:
        return undefined
    }
  }, [])

  const handleUpdateNode = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds: Node[]) =>
        nds.map((node: Node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...data } }
          }
          return node
        })
      )
      if (selectedNode?.id === id) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...data } } : null
        )
      }
    },
    [setNodes, selectedNode]
  )

  const handleUpdateEdge = useCallback(
    (id: string, data: Record<string, unknown>) => {
      updateEdgesWithHistory((eds: Edge[]) =>
        eds.map((edge: Edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              label: data.label as string,
              data: { ...edge.data, ...data },
              style: getEdgeStyle(data.lineStyle as string),
            }
          }
          return edge
        })
      )
      if (selectedEdge?.id === id) {
        setSelectedEdge((prev) =>
          prev
            ? {
                ...prev,
                label: data.label as string,
                data: { ...prev.data, ...data },
              }
            : null
        )
      }
    },
    [updateEdgesWithHistory, selectedEdge, getEdgeStyle]
  )

  const handleDeleteEdge = useCallback(
    (id: string) => {
      updateEdgesWithHistory((eds: Edge[]) =>
        eds.filter((edge: Edge) => edge.id !== id)
      )
      setSelectedEdge(null)
      setEdgeDialogOpen(false)
    },
    [updateEdgesWithHistory]
  )

  const handleSave = useCallback(() => {
    const data = { nodes, edges }
    localStorage.setItem("flow-design-data", JSON.stringify(data))
    toast.success(t("flow.saveSuccess"))
  }, [nodes, edges, t])

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem("flow-design-data")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNodes(parsed.nodes || [])
        setEdges(parsed.edges || [])
        historyRef.current = [
          { nodes: parsed.nodes || [], edges: parsed.edges || [] },
        ]
        historyIndexRef.current = 0
        toast.success(t("flow.loadSuccess"))
      } catch {
        toast.error(t("flow.loadFailed"))
      }
    }
  }, [setNodes, setEdges, t])

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "flow-design.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          setNodes(data.nodes || [])
          setEdges(data.edges || [])
          historyRef.current = [
            { nodes: data.nodes || [], edges: data.edges || [] },
          ]
          historyIndexRef.current = 0
          toast.success(t("flow.importSuccess"))
        } catch {
          toast.error(t("flow.importFailed"))
        }
      }
      reader.readAsText(file)
      event.target.value = ""
    },
    [setNodes, setEdges]
  )

  const handleReset = useCallback(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setSelectedNode(null)
    setSelectedEdge(null)
    historyRef.current = [{ nodes: initialNodes, edges: initialEdges }]
    historyIndexRef.current = 0
  }, [setNodes, setEdges])

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, nodeType: NodeTypeInfo) => {
      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify(nodeType)
      )
      event.dataTransfer.effectAllowed = "move"
    },
    []
  )

  const handleCopy = useCallback(() => {
    if (selectedNode) {
      copiedNodesRef.current = [selectedNode]
      toast.success(t("flow.copyNode"))
    }
  }, [selectedNode, t])

  const handlePaste = useCallback(() => {
    if (copiedNodesRef.current.length > 0) {
      const newNodes = copiedNodesRef.current.map((node) => ({
        ...node,
        id: `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        position: {
          x: node.position.x + 20,
          y: node.position.y + 20,
        },
        selected: false,
      }))
      setNodes((nds) => [...nds, ...newNodes])
      toast.success(t("flow.pasteNode"))
    }
  }, [setNodes, t])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("flow.title")}</h1>
          <p className="text-muted-foreground">{t("flow.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "design" | "preview")}
          >
            <TabsList>
              <TabsTrigger value="design">{t("flow.design")}</TabsTrigger>
              <TabsTrigger value="preview">{t("flow.preview")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {t("flow.save")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleLoad}>
          <Download className="h-4 w-4 mr-2" />
          {t("flow.load")}
        </Button>
        <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Upload className="h-4 w-4 mr-2" />
          {t("flow.import")}
        </label>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t("flow.export")}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo || mode !== "design"}
        >
          <Undo2 className="h-4 w-4 mr-2" />
          {t("flow.undo")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo || mode !== "design"}
        >
          <Redo2 className="h-4 w-4 mr-2" />
          {t("flow.redo")}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!selectedNode || mode !== "design"}
        >
          <Copy className="h-4 w-4 mr-2" />
          {t("flow.copy")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePaste}
          disabled={mode !== "design"}
        >
          <Clipboard className="h-4 w-4 mr-2" />
          {t("flow.paste")}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant={snapToGrid ? "default" : "outline"}
          size="sm"
          onClick={() => setSnapToGrid(!snapToGrid)}
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          {snapToGrid ? t("flow.closeGrid") : t("flow.openGrid")}
        </Button>

        <Button variant="outline" size="sm" onClick={handleReset}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t("flow.reset")}
        </Button>
      </div>

      <div className="flex gap-0 h-[600px]">
        {mode === "design" && <NodePanel onDragStart={handleDragStart} />}

        <FlowCanvas
          nodes={nodes}
          edges={edges}
          mode={mode}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          isGlass={isGlass}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onPaneClick={handlePaneClick}
        />

        {mode === "design" && (
          <PropertyPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
          />
        )}

        {mode === "preview" && (
          <div className="w-64 border-l p-4">
            <h3 className="font-semibold mb-3 text-sm">
              {t("flow.previewMode")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t("flow.previewModeDescription")}
            </p>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">{t("flow.nodeCount")}:</span>{" "}
                {nodes.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">{t("flow.edgeCount")}:</span>{" "}
                {edges.length}
              </div>
            </div>
          </div>
        )}
      </div>

      <FloatingToolbar
        x={toolbarPosition.x}
        y={toolbarPosition.y}
        visible={floatingToolbarVisible}
        type={selectedNode ? "node" : "edge"}
        onDelete={() => {
          if (selectedNode) {
            handleDeleteNode(selectedNode.id)
          } else if (selectedEdge) {
            handleDeleteEdge(selectedEdge.id)
          }
          setFloatingToolbarVisible(false)
        }}
        onCopy={() => {
          if (selectedNode) {
            copiedNodesRef.current = [selectedNode]
            toast.success(t("flow.copyNode"))
          }
          setFloatingToolbarVisible(false)
        }}
        onSettings={() => {
          if (selectedNode) {
            setNodeDialogOpen(true)
          } else if (selectedEdge) {
            setEdgeDialogOpen(true)
          }
          setFloatingToolbarVisible(false)
        }}
      />

      <NodePropertyDialog
        node={selectedNode}
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        onUpdate={handleUpdateNode}
        onDelete={handleDeleteNode}
      />

      <EdgePropertyDialog
        edge={selectedEdge}
        open={edgeDialogOpen}
        onOpenChange={setEdgeDialogOpen}
        onUpdate={handleUpdateEdge}
        onDelete={handleDeleteEdge}
      />

      <div className="text-xs text-muted-foreground">
        提示: 双击节点或连线打开属性弹窗 | Ctrl+Z撤销 | Ctrl+Shift+Z/Ctrl+Y重做
        | Ctrl+C复制 | Ctrl+V粘贴 | Delete删除
      </div>
    </div>
  )
}

export function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorInternal />
    </ReactFlowProvider>
  )
}
