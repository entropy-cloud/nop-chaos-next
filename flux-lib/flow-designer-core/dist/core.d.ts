import type { GraphDocument, GraphNode, GraphEdge, DesignerConfig, NormalizedDesignerConfig, DesignerSnapshot, DesignerEvent } from './types';
export interface DesignerCore {
    getSnapshot(): DesignerSnapshot;
    getDocument(): GraphDocument;
    getConfig(): NormalizedDesignerConfig;
    subscribe(listener: (event: DesignerEvent) => void): () => void;
    addNode(type: string, position: {
        x: number;
        y: number;
    }, data?: Record<string, unknown>): GraphNode | null;
    updateNode(nodeId: string, data: Record<string, unknown>): void;
    moveNode(nodeId: string, position: {
        x: number;
        y: number;
    }): void;
    duplicateNode(nodeId: string): GraphNode | null;
    deleteNode(nodeId: string): void;
    addEdge(source: string, target: string, data?: Record<string, unknown>): GraphEdge | null;
    reconnectEdge(edgeId: string, source: string, target: string): {
        ok: boolean;
        edge?: GraphEdge;
        error?: string;
        reason?: string;
    };
    updateEdge(edgeId: string, data: Record<string, unknown>): void;
    deleteEdge(edgeId: string): void;
    selectNode(nodeId: string | null): void;
    selectEdge(edgeId: string | null): void;
    clearSelection(): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    copySelection(): void;
    pasteClipboard(): void;
    toggleGrid(): void;
    setGrid(enabled: boolean): void;
    setViewport(viewport: {
        x: number;
        y: number;
        zoom: number;
    }): void;
    save(): void;
    restore(): void;
    exportDocument(): string;
    isDirty(): boolean;
    layoutNodes(positions: Map<string, {
        x: number;
        y: number;
    }>): void;
}
export declare function createDesignerCore(initialDoc: GraphDocument, config: DesignerConfig): DesignerCore;
