import type { DesignerCore, DesignerSnapshot, GraphEdge, GraphNode } from '@nop-chaos/flow-designer-core';
type DesignerCommandReason = 'constraint' | 'duplicate-edge' | 'missing-edge' | 'missing-node' | 'self-loop' | 'unchanged' | 'unknown-node-type' | 'unavailable';
export type DesignerCommand = {
    type: 'addEdge';
    source: string;
    target: string;
    data?: Record<string, unknown>;
} | {
    type: 'addNode';
    nodeType: string;
    position?: {
        x: number;
        y: number;
    };
    data?: Record<string, unknown>;
} | {
    type: 'clearSelection';
} | {
    type: 'deleteEdge';
    edgeId: string;
} | {
    type: 'deleteNode';
    nodeId: string;
} | {
    type: 'duplicateNode';
    nodeId: string;
} | {
    type: 'copySelection';
} | {
    type: 'pasteClipboard';
} | {
    type: 'deleteSelection';
} | {
    type: 'export';
} | {
    type: 'moveNode';
    nodeId: string;
    position: {
        x: number;
        y: number;
    };
} | {
    type: 'reconnectEdge';
    edgeId: string;
    source: string;
    target: string;
} | {
    type: 'redo';
} | {
    type: 'restore';
} | {
    type: 'save';
} | {
    type: 'selectEdge';
    edgeId: string | null;
} | {
    type: 'selectNode';
    nodeId: string | null;
} | {
    type: 'setViewport';
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
} | {
    type: 'toggleGrid';
} | {
    type: 'undo';
} | {
    type: 'updateEdgeData';
    edgeId: string;
    data: Record<string, unknown>;
} | {
    type: 'updateNodeData';
    nodeId: string;
    data: Record<string, unknown>;
};
export interface DesignerCommandResult {
    ok: boolean;
    snapshot: DesignerSnapshot;
    data?: unknown;
    error?: string;
    exported?: string;
    reason?: DesignerCommandReason;
}
export interface DesignerCommandAdapter {
    execute(command: DesignerCommand): DesignerCommandResult;
    getSnapshot(): DesignerSnapshot;
}
export declare function createDesignerCommandAdapter(core: DesignerCore): DesignerCommandAdapter;
export type { GraphEdge, GraphNode };
