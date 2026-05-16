import { useCallback, useMemo } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { FlowNodeKind } from '../../../services/mockApi';
import {
  cloneEdges,
  cloneNodes,
  createNode,
  normalizeEdge,
  shouldRecordEdgeChangeHistory,
  shouldRecordNodeChangeHistory,
} from './utils';
import type {
  DeleteTarget,
  FlowEdge,
  FlowEditorActions,
  FlowNode,
} from './types';
import type { FlowEditorState } from './useFlowEditorState';

interface UseFlowEditorActionsOptions {
  state: FlowEditorState;
}

export function useFlowEditorActions({ state }: UseFlowEditorActionsOptions) {
  const { t } = useTranslation();
  const {
    nodes,
    edges,
    hoveredNodeId,
    hoveredEdgeId,
    applyState,
    setSelectedNodeId,
    setSelectedEdgeId,
    setDeleteTarget,
    setDeleteDialogOpen,
    setInspectorCollapsed,
    setPropertyOpen,
    setEdgePanelOpen,
    setNodes,
    setEdges,
    undo,
    redo,
  } = state;

  const addNode = useCallback(
    (kind: FlowNodeKind, position?: XYPosition) => {
      const nextPosition = position ?? {
        x: 180 + nodes.length * 28,
        y: 120 + (nodes.length % 5) * 92,
      };
      if (kind === 'start' && nodes.some((node) => node.data.kind === 'start')) {
        toast.error(t('flowEditor.editor.startNodeUnique'));
        return;
      }

      const nextNode = createNode(kind, nextPosition);
      const nextNodes = [...nodes, nextNode];
      applyState(nextNodes, edges);
      setSelectedNodeId(nextNode.id);
      setSelectedEdgeId(null);
    },
    [applyState, edges, nodes, setSelectedEdgeId, setSelectedNodeId, t],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodes.find((node) => node.id === nodeId);
      if (!source) {
        return;
      }
      if (
        source.data.kind === 'start' &&
        nodes.some((node) => node.data.kind === 'start' && node.id !== nodeId)
      ) {
        toast.error(t('flowEditor.editor.startNodeDuplicateBlocked'));
        return;
      }

      const duplicated = createNode(
        source.data.kind,
        { x: source.position.x + 48, y: source.position.y + 48 },
        source.data,
      );
      const nextNodes = [...nodes, duplicated];
      applyState(nextNodes, edges);
      setSelectedNodeId(duplicated.id);
      setSelectedEdgeId(null);
    },
    [applyState, edges, nodes, setSelectedEdgeId, setSelectedNodeId, t],
  );

  const requestDelete = useCallback((target: DeleteTarget) => {
    setDeleteTarget(target);
    setDeleteDialogOpen(Boolean(target));
  }, [setDeleteDialogOpen, setDeleteTarget]);

  const openNodeEditor = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setInspectorCollapsed(false);
    if (window.matchMedia('(max-width: 1279px)').matches) {
      setPropertyOpen(true);
    }
  }, [setInspectorCollapsed, setPropertyOpen, setSelectedEdgeId, setSelectedNodeId]);

  const openEdgeEditor = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setInspectorCollapsed(false);
    if (window.matchMedia('(max-width: 1279px)').matches) {
      setEdgePanelOpen(true);
    }
  }, [setEdgePanelOpen, setInspectorCollapsed, setSelectedEdgeId, setSelectedNodeId]);

  const editorActions = useMemo<FlowEditorActions>(
    () => ({
      hoveredNodeId,
      hoveredEdgeId,
      openNodeEditor,
      openEdgeEditor,
      duplicateNode,
      requestDelete,
      selectNode: setSelectedNodeId,
      selectEdge: setSelectedEdgeId,
      setHoveredNode: state.setHoveredNodeId,
      setHoveredEdge: state.setHoveredEdgeId,
    }),
    [duplicateNode, hoveredEdgeId, hoveredNodeId, openEdgeEditor, openNodeEditor, requestDelete, setSelectedEdgeId, setSelectedNodeId, state],
  );

  const confirmDelete = useCallback(() => {
    if (!state.deleteTarget) {
      return;
    }

    if (state.deleteTarget.type === 'node') {
      const nextNodes = nodes.filter((node) => node.id !== state.deleteTarget!.id);
      const nextEdges = edges.filter(
        (edge) => edge.source !== state.deleteTarget!.id && edge.target !== state.deleteTarget!.id,
      );
      applyState(nextNodes, nextEdges);
      setSelectedNodeId(null);
    } else {
      applyState(
        nodes,
        edges.filter((edge) => edge.id !== state.deleteTarget!.id),
      );
      setSelectedEdgeId(null);
    }

    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  }, [applyState, edges, nodes, setDeleteDialogOpen, setDeleteTarget, setSelectedEdgeId, setSelectedNodeId, state.deleteTarget]);

  const handleUndo = useCallback(() => {
    const snapshot = undo();
    if (!snapshot) {
      return;
    }

    setNodes(cloneNodes(snapshot.nodes));
    setEdges(cloneEdges(snapshot.edges));
  }, [setEdges, setNodes, undo]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();
    if (!snapshot) {
      return;
    }

    setNodes(cloneNodes(snapshot.nodes));
    setEdges(cloneEdges(snapshot.edges));
  }, [setEdges, setNodes, redo]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyState(
        applyNodeChanges(changes, nodes) as FlowNode[],
        edges,
        shouldRecordNodeChangeHistory(changes),
      );
    },
    [applyState, edges, nodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyState(
        nodes,
        applyEdgeChanges(changes, edges) as FlowEdge[],
        shouldRecordEdgeChangeHistory(changes),
      );
    },
    [applyState, edges, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: FlowEdge = normalizeEdge({
        ...connection,
        id: `edge-${Date.now()}`,
        label: 'flowEditor.editor.defaultEdgePath',
        data: { condition: 'flowEditor.editor.defaultEdgePath', lineStyle: 'solid' },
      } as FlowEdge);
      applyState(nodes, addEdge(edge, edges) as FlowEdge[]);
    },
    [applyState, edges, nodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
      applyState(
        nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
        edges,
      );
    },
    [applyState, edges, nodes],
  );

  const updateEdgeData = useCallback(
    (edgeId: string, updater: (edge: FlowEdge) => FlowEdge) => {
      applyState(
        nodes,
        edges.map((edge) => (edge.id === edgeId ? normalizeEdge(updater(edge)) : edge)),
      );
    },
    [applyState, edges, nodes],
  );

  return {
    addNode,
    duplicateNode,
    requestDelete,
    openNodeEditor,
    openEdgeEditor,
    editorActions,
    confirmDelete,
    handleUndo,
    handleRedo,
    onNodesChange,
    onEdgesChange,
    onConnect,
    updateNodeData,
    updateEdgeData,
  };
}
