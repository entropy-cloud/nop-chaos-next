import React from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { DesignerCore, DesignerSnapshot, DesignerConfig, NodeTypeConfig, EdgeTypeConfig, NormalizedDesignerConfig } from '@nop-chaos/flow-designer-core';
import type { DesignerCommandAdapter } from './designer-command-adapter';
export interface DesignerContextValue {
    core: DesignerCore;
    commandAdapter: DesignerCommandAdapter;
    dispatch: (command: import('./designer-command-adapter').DesignerCommand) => import('./designer-command-adapter').DesignerCommandResult;
    snapshot: DesignerSnapshot;
    config: DesignerConfig;
}
export declare const DesignerContext: React.Context<DesignerContextValue | null>;
export declare function useDesignerContext(): DesignerContextValue;
export declare function useDesignerSnapshot(core: DesignerCore): DesignerSnapshot;
export declare function notifyCommandFailure(notify: import('@nop-chaos/flux-core').RendererEnv['notify'] | undefined, error: string | undefined, reason?: string): void;
export declare function toActionResult(result: import('./designer-command-adapter').DesignerCommandResult): {
    ok: boolean;
    data: unknown;
    error: Error | undefined;
};
export declare function buildDesignerScopeData(input: {
    snapshot: DesignerSnapshot;
    config: DesignerConfig;
    core: DesignerCore;
}): {
    doc: import("@nop-chaos/flow-designer-core").GraphDocument;
    selection: {
        kind: string;
        count: number;
        nodeIds: string[];
        edgeIds: string[];
        selectedNodeIds: string[];
        selectedEdgeIds: string[];
        activeNodeId: string | null;
        activeEdgeId: string | null;
    };
    activeNode: import("@nop-chaos/flow-designer-core").GraphNode | null;
    activeEdge: import("@nop-chaos/flow-designer-core").GraphEdge | null;
    runtime: {
        canUndo: boolean;
        canRedo: boolean;
        dirty: boolean;
        isDirty: boolean;
        gridEnabled: boolean;
        zoom: number;
        viewport: {
            x: number;
            y: number;
            zoom: number;
        };
    };
    palette: import("@nop-chaos/flow-designer-core").PaletteConfig | undefined;
    nodeTypes: NodeTypeConfig[];
    edgeTypes: EdgeTypeConfig[] | undefined;
    designerCore: DesignerCore;
};
export declare function useDesignerHostScope(input: {
    snapshot: DesignerSnapshot;
    config: DesignerConfig;
    core: DesignerCore;
    path: string;
}): ScopeRef;
export declare function useNormalizedConfig(): NormalizedDesignerConfig;
export declare function useNodeTypeConfig(typeId: string): NodeTypeConfig | undefined;
export declare function useEdgeTypeConfig(typeId: string): EdgeTypeConfig | undefined;
