import { DesignerXyflowCanvas, type DesignerXyflowCanvasProps, DESIGNER_PALETTE_NODE_MIME } from './designer-xyflow-canvas';
export type DesignerCanvasAdapterKind = 'xyflow';
export interface DesignerCanvasBridgeProps extends DesignerXyflowCanvasProps {
}
export declare const DesignerXyflowCanvasBridge: typeof DesignerXyflowCanvas;
export { DESIGNER_PALETTE_NODE_MIME };
export declare function renderDesignerCanvasBridge(kind: DesignerCanvasAdapterKind, props: DesignerCanvasBridgeProps): import("react/jsx-runtime").JSX.Element;
