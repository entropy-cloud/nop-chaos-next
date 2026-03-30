import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Handle, Position } from '@xyflow/react';
import { POSITION_MAP } from './types';
const defaultHandleClass = '!w-3 !h-3 !rounded-full !bg-primary !border-2 !border-white';
export function renderPorts(ports) {
    if (!ports || ports.length === 0) {
        return (_jsxs(_Fragment, { children: [_jsx(Handle, { type: "target", position: Position.Top, className: defaultHandleClass }), _jsx(Handle, { type: "source", position: Position.Bottom, className: defaultHandleClass })] }));
    }
    return ports.map((port) => {
        const position = POSITION_MAP[port.position ?? 'top'];
        const type = port.direction === 'input' ? 'target' : 'source';
        return (_jsx(Handle, { type: type, position: position, id: port.id, className: `${port.appearance?.className ?? defaultHandleClass}` }, port.id));
    });
}
