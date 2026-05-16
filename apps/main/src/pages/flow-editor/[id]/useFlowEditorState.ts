import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import {
  fetchFlowDetail,
  type FlowDocument,
} from '../../../services/mockApi';
import { cloneEdges, cloneNodes, normalizeEdge } from './utils';
import type { DeleteTarget, FlowEdge, FlowNode, FlowNodeData } from './types';
import { useFlowHistory } from './useFlowHistory';

export interface FlowEditorState {
  flowDocument: FlowDocument | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  gridEnabled: boolean;
  propertyOpen: boolean;
  edgePanelOpen: boolean;
  deleteDialogOpen: boolean;
  deleteTarget: DeleteTarget;
  clipboardNode: FlowNode | null;
  savedSnapshot: string;
  inspectorCollapsed: boolean;
  dirty: boolean;
  selectedNode: FlowNode | null;
  selectedEdge: FlowEdge | null;
  canUndo: boolean;
  canRedo: boolean;
  applyState: (nextNodes: FlowNode[], nextEdges: FlowEdge[], recordHistory?: boolean) => void;
  setFlowDocument: (doc: FlowDocument | null) => void;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedEdgeId: Dispatch<SetStateAction<string | null>>;
  setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
  setHoveredEdgeId: Dispatch<SetStateAction<string | null>>;
  setGridEnabled: Dispatch<SetStateAction<boolean>>;
  setPropertyOpen: Dispatch<SetStateAction<boolean>>;
  setEdgePanelOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteTarget: (target: DeleteTarget) => void;
  setClipboardNode: (node: FlowNode | null) => void;
  setSavedSnapshot: Dispatch<SetStateAction<string>>;
  setInspectorCollapsed: Dispatch<SetStateAction<boolean>>;
  undo: () => import('./types').FlowStateSnapshot | null;
  redo: () => import('./types').FlowStateSnapshot | null;
}

export function useFlowEditorState(): FlowEditorState {
  const { t } = useTranslation();
  const _navigate = useNavigate();
  const { id = 'new' } = useParams();
  const { screenToFlowPosition: _screenToFlowPosition, fitView } = useReactFlow<FlowNode, FlowEdge>();

  const [flowDocument, setFlowDocument] = useState<FlowDocument | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [edgePanelOpen, setEdgePanelOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<import('./types').DeleteTarget>(null);
  const [clipboardNode, setClipboardNode] = useState<FlowNode | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const dirty =
    initialized && JSON.stringify({ nodes, edges }) !== savedSnapshot;

  const { canUndo, canRedo, initializeHistory, recordSnapshot, undo, redo } =
    useFlowHistory();

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const applyState = useCallback(
    (nextNodes: FlowNode[], nextEdges: FlowEdge[], recordHistory = true) => {
      const nodesSnapshot = cloneNodes(nextNodes);
      const edgesSnapshot = cloneEdges(nextEdges);
      setNodes(nodesSnapshot);
      setEdges(edgesSnapshot);

      if (!recordHistory) {
        return;
      }

      recordSnapshot(nodesSnapshot, edgesSnapshot);
    },
    [recordSnapshot],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchFlowDetail(id, controller.signal)
      .then((payload) => {
        const normalizedNodes = payload.nodes.map((node) => ({
          ...node,
          data: node.data as FlowNodeData,
        })) as FlowNode[];
        const normalizedEdges = payload.edges.map((edge) =>
          normalizeEdge(edge as FlowEdge),
        );
        const snapshot = JSON.stringify({
          nodes: normalizedNodes,
          edges: normalizedEdges,
        });
        setInitialized(true);
        setFlowDocument(payload);
        setNodes(cloneNodes(normalizedNodes));
        setEdges(cloneEdges(normalizedEdges));
        initializeHistory({
          nodes: cloneNodes(normalizedNodes),
          edges: cloneEdges(normalizedEdges),
        });
        setSavedSnapshot(snapshot);
        window.setTimeout(
          () => void fitView({ duration: 250, padding: 0.2 }),
          50,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        toast.error(
          error instanceof Error ? error.message : t('flowEditor.loadFailed'),
        );
      });

    return () => {
      controller.abort(new Error('Flow editor unmounted'));
    };
  }, [fitView, id, initializeHistory, t]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  return {
    flowDocument,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    hoveredNodeId,
    hoveredEdgeId,
    gridEnabled,
    propertyOpen,
    edgePanelOpen,
    deleteDialogOpen,
    deleteTarget,
    clipboardNode,
    savedSnapshot,
    inspectorCollapsed,
    dirty,
    selectedNode,
    selectedEdge,
    canUndo,
    canRedo,
    applyState,
    setFlowDocument,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedEdgeId,
    setHoveredNodeId,
    setHoveredEdgeId,
    setGridEnabled,
    setPropertyOpen,
    setEdgePanelOpen,
    setDeleteDialogOpen,
    setDeleteTarget,
    setClipboardNode,
    setSavedSnapshot,
    setInspectorCollapsed,
    undo,
    redo,
  };
}
