import type { Dispatch, SetStateAction } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';

import type { FlowNodeKind } from '../../../services/mock-api';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  kind: FlowNodeKind;
  config: Record<string, string>;
}

export interface FlowEdgeData extends Record<string, unknown> {
  condition: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge<FlowEdgeData>;

export type DeleteTarget = { type: 'node' | 'edge'; id: string } | null;

export interface FlowEditorActions {
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  openNodeEditor: (nodeId: string) => void;
  openEdgeEditor: (edgeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  requestDelete: (target: DeleteTarget) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  setHoveredNode: Dispatch<SetStateAction<string | null>>;
  setHoveredEdge: Dispatch<SetStateAction<string | null>>;
}

export interface FlowStateSnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface NodeMeta {
  labelKey: string;
  icon: LucideIcon;
  accent: string;
  chip: string;
}

export interface PaletteGroup {
  id: string;
  titleKey: string;
  descriptionKey: string;
  kinds: FlowNodeKind[];
}

export interface FlowSelectionSummary {
  title: string;
  description: string;
  type: string;
}
