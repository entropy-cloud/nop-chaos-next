// @vitest-environment happy-dom
import { createElement, useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FlowNode, FlowEdge, FlowEditorActions } from './types';
import type { FlowEditorState } from './useFlowEditorState';
import { useFlowEditorActions } from './useFlowEditorActions';

const EMPTY_NODES: FlowNode[] = [];
const EMPTY_EDGES: FlowEdge[] = [];
const NOOP = () => {};

function createBaselineState(): FlowEditorState {
  return {
    nodes: EMPTY_NODES,
    edges: EMPTY_EDGES,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null,
    gridEnabled: true,
    propertyOpen: false,
    edgePanelOpen: false,
    deleteDialogOpen: false,
    deleteTarget: null,
    clipboardNode: null,
    savedSnapshot: '',
    inspectorCollapsed: false,
    dirty: false,
    selectedNode: null,
    selectedEdge: null,
    canUndo: false,
    canRedo: false,
    flowDocument: null,
    applyState: NOOP,
    setFlowDocument: NOOP,
    setNodes: NOOP,
    setEdges: NOOP,
    setSelectedNodeId: NOOP,
    setSelectedEdgeId: NOOP,
    setHoveredNodeId: NOOP,
    setHoveredEdgeId: NOOP,
    setGridEnabled: NOOP,
    setPropertyOpen: NOOP,
    setEdgePanelOpen: NOOP,
    setDeleteDialogOpen: NOOP,
    setDeleteTarget: NOOP,
    setClipboardNode: NOOP,
    setSavedSnapshot: NOOP,
    setInspectorCollapsed: NOOP,
    undo: () => null,
    redo: () => null,
    getActiveFlowRouteId: () => '',
    getActiveFlowDocumentId: () => null,
  };
}

describe('useFlowEditorActions editorActions identity', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    root?.unmount();
    document.body.removeChild(container);
  });

  it('keeps editorActions stable when unrelated state field changes', () => {
    const identities: FlowEditorActions[] = [];

    const TestHarness: FC = () => {
      const [, forceUpdate] = useState(0);
      const state = createBaselineState();
      const { editorActions } = useFlowEditorActions({ state });

      identities.push(editorActions);
      return createElement('div', { onClick: () => forceUpdate((n) => n + 1) });
    };

    root = createRoot(container);
    // render once — each render creates a fresh state with same baseline values
    // but different object identity. editorActions deps should only depend on
    // stable callbacks, so identity stays the same across re-renders.
    for (let i = 0; i < 3; i++) {
      root.render(createElement(TestHarness));
    }

    const first = identities[0];
    for (let i = 1; i < identities.length; i++) {
      expect(identities[i]).toBe(first);
    }
  });

  it('keeps editorActions stable when hover state changes externally', () => {
    const identities: FlowEditorActions[] = [];

    let currentHover: string | null = null;

    function makeState(): FlowEditorState {
      const s = createBaselineState();
      s.hoveredNodeId = currentHover;
      return s;
    }

    const TestHarness: FC<{ n: number }> = () => {
      const state = makeState();
      const { editorActions } = useFlowEditorActions({ state });
      identities.push(editorActions);
      return null;
    };

    root = createRoot(container);
    // First render: no hover
    root.render(createElement(TestHarness, { n: 0 }));
    // Second render: hover changes — but editorActions should not change
    currentHover = 'node-1';
    root.render(createElement(TestHarness, { n: 1 }));

    const first = identities[0];
    for (let i = 1; i < identities.length; i++) {
      expect(identities[i]).toBe(first);
    }
  });
});
