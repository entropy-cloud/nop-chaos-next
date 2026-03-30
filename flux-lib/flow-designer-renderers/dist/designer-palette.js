import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { DESIGNER_PALETTE_NODE_MIME } from './canvas-bridge';
export function DesignerPaletteContent() {
    const { config, dispatch, snapshot } = useDesignerContext();
    const [expandedGroups, setExpandedGroups] = useState(new Set(['basic', 'logic', 'execution']));
    const nodeTypes = config.nodeTypes;
    const paletteGroups = config.palette?.groups ?? [];
    const toggleGroup = useCallback((groupId) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            }
            else {
                next.add(groupId);
            }
            return next;
        });
    }, []);
    const handleAddNode = useCallback((nodeType) => {
        const position = { x: 180 + Math.random() * 200, y: 120 + Math.random() * 200 };
        dispatch({ type: 'addNode', nodeType: nodeType.id, position });
    }, [dispatch]);
    const filteredGroups = paletteGroups.filter((g) => g.nodeTypes.length > 0);
    return (_jsxs("div", { className: "nop-palette flex flex-col h-full text-foreground", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-foreground", children: "\u8282\u70B9\u5E93" }), _jsx("div", { className: "text-sm text-muted-foreground", children: "\u62D6\u62FD\u6216\u70B9\u51FB\u6DFB\u52A0" })] }), _jsx("span", { className: "text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-transparent", children: nodeTypes.length })] }), _jsx("div", { className: "flex-1 min-h-0 overflow-y-auto p-3", children: filteredGroups.map((group) => (_jsxs("div", { className: "rounded-lg border border-border p-2.5 mb-3 last:mb-0", style: { background: 'rgba(255, 255, 255, 0.45)' }, children: [_jsxs("div", { className: "nop-palette__group-header flex items-center gap-1.5 cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] mb-2 px-1", style: { color: 'hsl(221.2, 83.2%, 40%)' }, onClick: () => toggleGroup(group.id), children: [_jsx("span", { className: "text-[10px] text-muted-foreground", children: expandedGroups.has(group.id) ? '▼' : '▶' }), _jsx("span", { children: group.label })] }), expandedGroups.has(group.id) && (_jsx("div", { children: group.nodeTypes.map((ntId) => {
                                const nt = nodeTypes.find((n) => n.id === ntId);
                                if (!nt)
                                    return null;
                                const isSelected = snapshot.activeNode?.type === nt.id;
                                return (_jsxs("div", { className: `nop-palette__item flex items-center gap-2 rounded-xl border border-border p-2 mb-2 last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${isSelected ? 'border-primary' : ''}`, style: { background: 'rgba(255, 255, 255, 0.7)' }, children: [_jsxs("button", { type: "button", className: "flex flex-1 min-w-0 items-center gap-3 text-left bg-transparent border-none cursor-pointer p-0", onClick: () => handleAddNode(nt), draggable: true, onDragStart: (event) => {
                                                event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
                                                event.dataTransfer.effectAllowed = 'move';
                                            }, title: nt.description ?? nt.label, children: [_jsx("span", { className: `w-8 h-8 rounded-lg inline-flex items-center justify-center text-white shrink-0 nop-gradient-${nt.id}`, "data-type": nt.id, "aria-hidden": "true", children: nt.icon ? _jsx(DesignerIcon, { icon: nt.icon, className: "nop-icon nop-icon--white" }) : '◇' }), _jsx("span", { className: "text-sm font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis", children: nt.label })] }), _jsx("button", { type: "button", className: "w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer inline-flex items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground", onClick: () => handleAddNode(nt), "aria-label": `Add ${nt.label}`, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M5 12h14" }), _jsx("path", { d: "M12 5v14" })] }) })] }, nt.id));
                            }) }))] }, group.id))) })] }));
}
