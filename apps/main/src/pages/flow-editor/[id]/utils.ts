import { MarkerType, type EdgeChange, type NodeChange, type XYPosition } from '@xyflow/react';
import type { FlowNodeKind } from '../../../services/mock-api';
import { defaultNodeConfig, nodeMeta } from './constants';
import type { FlowEdge, FlowEdgeData, FlowNode, FlowStateSnapshot } from './types';

export function getEdgeStyle(lineStyle: FlowEdgeData['lineStyle']) {
  if (lineStyle === 'dashed') return { strokeDasharray: '8 6' };
  if (lineStyle === 'dotted') return { strokeDasharray: '2 6' };
  return undefined;
}

export function normalizeEdge(edge: FlowEdge): FlowEdge {
  return {
    ...edge,
    type: 'flowEdge',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: edge.data ?? {
      condition: edge.label?.toString() ?? 'flowEditor.editor.defaultEdgePath',
      lineStyle: 'solid',
    },
    style: getEdgeStyle(edge.data?.lineStyle ?? 'solid'),
  };
}

export function cloneNodes(nodes: FlowNode[]): FlowNode[] {
  return structuredClone(nodes);
}

export function cloneEdges(edges: FlowEdge[]): FlowEdge[] {
  return structuredClone(edges);
}

export function createFlowStateSnapshot(nodes: FlowNode[], edges: FlowEdge[]): FlowStateSnapshot {
  return { nodes: cloneNodes(nodes), edges: cloneEdges(edges) };
}

export function createNode(
  kind: FlowNodeKind,
  position: XYPosition,
  seed?: Partial<FlowNode['data']>,
): FlowNode {
  const meta = nodeMeta[kind];
  return {
    id: `${kind}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: kind,
    position,
    data: {
      label: seed?.label ?? meta.labelKey,
      description: seed?.description ?? 'flowEditor.editor.defaultNodeDescription',
      kind,
      config: { ...defaultNodeConfig[kind], ...(seed?.config ?? {}) },
    },
  };
}

export function shouldRecordNodeChangeHistory(changes: NodeChange[]): boolean {
  return changes.some((change) => {
    if (change.type === 'select' || change.type === 'dimensions') return false;
    if (change.type === 'position') return change.dragging === false;
    return true;
  });
}

export function shouldRecordEdgeChangeHistory(changes: EdgeChange[]): boolean {
  return changes.some((change) => change.type !== 'select');
}

export function flowEditorTestUtils() {
  return {
    createNode,
    normalizeEdge,
    createFlowStateSnapshot,
    getEdgeStyle,
    shouldRecordNodeChangeHistory,
    shouldRecordEdgeChangeHistory,
  };
}
