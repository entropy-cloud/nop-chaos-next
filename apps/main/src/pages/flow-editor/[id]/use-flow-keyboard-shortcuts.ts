import { useEffect } from 'react';
import type { TFunction } from 'i18next';
import { toast } from '@nop-chaos/ui';
import { createNode } from './utils';
import type { DeleteTarget, FlowEdge, FlowNode } from './types';

interface UseFlowKeyboardShortcutsOptions {
  t: TFunction;
  selectedNode: FlowNode | null;
  clipboardNode: FlowNode | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setClipboardNode: (node: FlowNode | null) => void;
  applyState: (nextNodes: FlowNode[], nextEdges: FlowEdge[], recordHistory?: boolean) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  requestDelete: (target: DeleteTarget) => void;
}

export function useFlowKeyboardShortcuts({
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
  requestDelete,
}: UseFlowKeyboardShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }

      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
      }

      if (meta && event.key.toLowerCase() === 'c' && selectedNode) {
        event.preventDefault();
        setClipboardNode(structuredClone(selectedNode));
        toast.success(t('flowEditor.editor.nodeCopied'));
      }

      if (meta && event.key.toLowerCase() === 'v' && clipboardNode) {
        event.preventDefault();
        if (
          clipboardNode.data.kind === 'start' &&
          nodes.some((node) => node.data.kind === 'start')
        ) {
          toast.error(t('flowEditor.editor.startNodeSinglePreserved'));
          return;
        }
        const pasted = createNode(
          clipboardNode.data.kind,
          { x: clipboardNode.position.x + 56, y: clipboardNode.position.y + 56 },
          clipboardNode.data,
        );
        applyState([...nodes, pasted], edges);
        setSelectedNodeId(pasted.id);
      }

      if (event.key === 'Delete') {
        if (selectedNodeId) {
          requestDelete({ type: 'node', id: selectedNodeId });
        } else if (selectedEdgeId) {
          requestDelete({ type: 'edge', id: selectedEdgeId });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    applyState,
    clipboardNode,
    edges,
    handleRedo,
    handleUndo,
    nodes,
    requestDelete,
    selectedEdgeId,
    selectedNode,
    selectedNodeId,
    setClipboardNode,
    setSelectedNodeId,
    t,
  ]);
}
