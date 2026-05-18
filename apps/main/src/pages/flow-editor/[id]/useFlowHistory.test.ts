// @vitest-environment happy-dom
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFlowHistory } from './useFlowHistory';
import type { FlowStateSnapshot } from './types';

describe('useFlowHistory', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it('resetHistory clears undo/redo state after route changes', () => {
    const apiRef: { current?: ReturnType<typeof useFlowHistory> } = {};

    function TestHarness() {
      const value = useFlowHistory();

      useEffect(() => {
        apiRef.current = value;
      }, [value]);

      return null;
    }

    act(() => {
      root.render(createElement(TestHarness));
    });

    const snapshot = {
      nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { kind: 'task', label: 'A', description: 'A', config: {} } }],
      edges: [],
    } as unknown as FlowStateSnapshot;

    act(() => {
      apiRef.current?.initializeHistory(snapshot);
      apiRef.current?.recordSnapshot(snapshot.nodes, snapshot.edges);
    });

    expect(apiRef.current?.canUndo).toBe(true);

    act(() => {
      apiRef.current?.resetHistory();
    });

    expect(apiRef.current?.history).toEqual([]);
    expect(apiRef.current?.historyIndex).toBe(-1);
    expect(apiRef.current?.canUndo).toBe(false);
    expect(apiRef.current?.canRedo).toBe(false);
  });
});
