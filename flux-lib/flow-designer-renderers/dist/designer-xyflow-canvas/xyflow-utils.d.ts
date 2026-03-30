import type { Edge, Node } from '@xyflow/react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import type { DesignerXyflowControlledViewport, XyflowViewportChange } from './types';
export declare function createXyflowNodes(snapshot: DesignerSnapshot, nodeTypeSizeMap?: Map<string, {
    minWidth?: number;
    minHeight?: number;
}>): Node[];
export declare function createXyflowEdges(snapshot: DesignerSnapshot): Edge[];
export declare function normalizeControlledViewport(viewport: {
    x: number;
    y: number;
    zoom: number;
}): DesignerXyflowControlledViewport;
export declare function viewportsEqual(left: DesignerXyflowControlledViewport, right: DesignerXyflowControlledViewport): boolean;
export declare function normalizeViewportChange(value: XyflowViewportChange | null | undefined): DesignerXyflowControlledViewport | null;
export declare function normalizePositionSignature(position: {
    x: number;
    y: number;
}): string;
