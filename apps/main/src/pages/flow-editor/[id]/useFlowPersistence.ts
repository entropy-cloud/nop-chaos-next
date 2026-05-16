import { useCallback } from 'react';
import { MarkerType } from '@xyflow/react';
import { toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { cloneEdges, cloneNodes, getEdgeStyle } from './utils';
import type { FlowDocument } from '../../../services/mockApi';
import type { FlowEditorState } from './useFlowEditorState';

interface UseFlowPersistenceOptions {
  state: FlowEditorState;
}

export function useFlowPersistence({ state }: UseFlowPersistenceOptions) {
  const { t } = useTranslation();
  const { flowDocument, nodes, edges, savedSnapshot, applyState, setFlowDocument, setSavedSnapshot } =
    state;

  const saveSnapshot = useCallback(async () => {
    if (!flowDocument) {
      return;
    }

    const payload: FlowDocument = {
      ...flowDocument,
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges).map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: getEdgeStyle(edge.data?.lineStyle ?? 'solid'),
        type: 'flowEdge',
      })),
    };

    const saved = await import('../../../services/mockApi').then((m) =>
      m.saveFlowDetail(payload),
    );
    setFlowDocument(saved);
    setSavedSnapshot(JSON.stringify({ nodes, edges }));
    toast.success(t('flowEditor.editor.saveSuccess'));
  }, [flowDocument, nodes, edges, setFlowDocument, setSavedSnapshot, t]);

  const restoreSaved = useCallback(() => {
    if (!savedSnapshot) {
      return;
    }

    const parsed = JSON.parse(savedSnapshot) as {
      nodes: import('./types').FlowNode[];
      edges: import('./types').FlowEdge[];
    };
    applyState(parsed.nodes, parsed.edges);
    toast.success(t('flowEditor.editor.restoreSuccess'));
  }, [savedSnapshot, applyState, t]);

  const exportJson = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ ...flowDocument, nodes, edges }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${flowDocument?.name ?? 'flow'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [flowDocument, nodes, edges]);

  return { saveSnapshot, restoreSaved, exportJson };
}
