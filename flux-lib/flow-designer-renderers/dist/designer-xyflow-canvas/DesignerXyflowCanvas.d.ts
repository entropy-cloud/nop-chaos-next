import React from 'react';
import '@xyflow/react/dist/style.css';
import type { CanvasConfig, DesignerSnapshot } from '@nop-chaos/flow-designer-core';
export declare const DESIGNER_PALETTE_NODE_MIME = "application/x-flow-designer-node-type";
export interface DesignerXyflowCanvasProps {
    snapshot: DesignerSnapshot;
    canvasConfig?: CanvasConfig;
    nodeTypeSizeMap?: Map<string, {
        minWidth?: number;
        minHeight?: number;
    }>;
    pendingConnectionSourceId: string | null;
    reconnectingEdgeId: string | null;
    showMinimap?: boolean;
    showControls?: boolean;
    onPaneClick(): void;
    onNodeSelect(nodeId: string, event?: React.MouseEvent): void;
    onEdgeSelect(edgeId: string, event?: React.MouseEvent): void;
    onStartConnection(nodeId: string, event?: React.MouseEvent): void;
    onCancelConnection(nodeId: string, event?: React.MouseEvent): void;
    onCompleteConnection(nodeId: string, event?: React.MouseEvent): void;
    onStartReconnect(edgeId: string, event?: React.MouseEvent): void;
    onCancelReconnect(edgeId: string, event?: React.MouseEvent): void;
    onCompleteReconnect(edgeId: string, sourceId: string, targetId: string, event?: React.MouseEvent): void;
    onDuplicateNode(nodeId: string, event?: React.MouseEvent): void;
    onDeleteNode(nodeId: string, event?: React.MouseEvent): void;
    onDeleteEdge(edgeId: string, event?: React.MouseEvent): void;
    onMoveNode(nodeId: string, event?: React.MouseEvent, position?: {
        x: number;
        y: number;
    }): void;
    onViewportChange(viewport: {
        x: number;
        y: number;
        zoom: number;
    }, event?: React.MouseEvent): void;
    onNodeDoubleClick?(nodeId: string, event?: React.MouseEvent): void;
    onEdgeDoubleClick?(edgeId: string, event?: React.MouseEvent): void;
    onNodeHover?(nodeId: string | null, event?: React.MouseEvent): void;
    onEdgeHover?(edgeId: string | null, event?: React.MouseEvent): void;
    onDrop?(nodeTypeId: string, position: {
        x: number;
        y: number;
    }): void;
}
export declare function DesignerXyflowCanvas(props: DesignerXyflowCanvasProps): import("react/jsx-runtime").JSX.Element;
