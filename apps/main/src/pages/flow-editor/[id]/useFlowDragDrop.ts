import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { DragEvent as ReactDragEvent } from 'react';
import type { FlowNodeKind } from '../../../services/mockApi';

interface UseFlowDragDropOptions {
  addNode: (kind: FlowNodeKind, position?: import('@xyflow/react').XYPosition) => void;
}

export function useFlowDragDrop({ addNode }: UseFlowDragDropOptions) {
  const { screenToFlowPosition } = useReactFlow<
    import('./types').FlowNode,
    import('./types').FlowEdge
  >();

  const onPaletteDragStart = useCallback(
    (event: ReactDragEvent<HTMLButtonElement>, kind: FlowNodeKind) => {
      event.dataTransfer.setData('application/x-flow-node', kind);
      event.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const onCanvasDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer?.getData('application/x-flow-node') as
        | FlowNodeKind
        | '';
      if (!kind) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) ?? { x: 0, y: 0 };
      addNode(kind, position);
    },
    [addNode, screenToFlowPosition],
  );

  const onCanvasDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  return { onPaletteDragStart, onCanvasDrop, onCanvasDragOver };
}
