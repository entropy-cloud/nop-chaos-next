import { jsx as _jsx } from "react/jsx-runtime";
import { DesignerXyflowCanvas, DESIGNER_PALETTE_NODE_MIME } from './designer-xyflow-canvas';
export const DesignerXyflowCanvasBridge = DesignerXyflowCanvas;
export { DESIGNER_PALETTE_NODE_MIME };
export function renderDesignerCanvasBridge(kind, props) {
    return _jsx(DesignerXyflowCanvasBridge, { ...props });
}
