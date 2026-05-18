import { useCallback, useRef, useState } from 'react';
import { MAX_HISTORY_SIZE } from './constants';
import { cloneEdges, cloneNodes } from './utils';
import type { FlowEdge, FlowNode, FlowStateSnapshot } from './types';

export function useFlowHistory(initialSnapshot?: FlowStateSnapshot) {
  const [history, setHistory] = useState<FlowStateSnapshot[]>(
    initialSnapshot ? [initialSnapshot] : [],
  );
  const [historyIndex, setHistoryIndex] = useState(initialSnapshot ? 0 : -1);
  const historyIndexRef = useRef(historyIndex);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  const initializeHistory = useCallback((snapshot: FlowStateSnapshot) => {
    historyIndexRef.current = 0;
    setHistory([snapshot]);
    setHistoryIndex(0);
  }, []);

  const resetHistory = useCallback(() => {
    historyIndexRef.current = -1;
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const recordSnapshot = useCallback((nodes: FlowNode[], edges: FlowEdge[]) => {
    setHistory((current) => {
      const base = current.slice(0, historyIndexRef.current + 1);
      const next = [...base, { nodes: cloneNodes(nodes), edges: cloneEdges(edges) }].slice(
        -MAX_HISTORY_SIZE,
      );
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(historyIndexRef.current);
      return next;
    });
  }, []);

  const undo = useCallback((): FlowStateSnapshot | null => {
    if (historyIndexRef.current <= 0) return null;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    return history[nextIndex] ?? null;
  }, [history]);

  const redo = useCallback((): FlowStateSnapshot | null => {
    if (historyIndexRef.current >= history.length - 1) return null;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    return history[nextIndex] ?? null;
  }, [history]);

  return {
    history,
    historyIndex,
    historyIndexRef,
    canUndo,
    canRedo,
    initializeHistory,
    resetHistory,
    recordSnapshot,
    undo,
    redo,
  };
}
