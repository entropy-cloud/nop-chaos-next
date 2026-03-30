import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes, ClassAliasesContext } from '@nop-chaos/flux-react';
import { useNodeTypeConfig, useDesignerContext } from '../designer-context';
import { renderPorts } from './render-ports';
import { DesignerIcon } from '../designer-icon';
import { Button } from '@nop-chaos/ui';
function classNames(...values) {
    return values.filter(Boolean).join(' ');
}
function isSchemaInput(value) {
    return isSchema(value);
}
export function DesignerXyflowNode(props) {
    const data = props.data;
    const nodeType = useNodeTypeConfig(data.typeId);
    const { dispatch, config } = useDesignerContext();
    const [showToolbar, setShowToolbar] = useState(false);
    const hideToolbarTimeoutRef = useRef(null);
    const nodeRenderData = useMemo(() => ({
        node: {
            id: props.id,
            type: data.typeId,
            label: data.label,
            data: props.data
        },
        data: props.data
    }), [props.id, props.data, data.typeId, data.label]);
    const hasQuickActions = nodeType?.quickActions && isSchemaInput(nodeType.quickActions);
    const actionScope = useMemo(() => ({
        onEdit: () => dispatch({ type: 'selectNode', nodeId: props.id }),
        onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
        onDelete: () => dispatch({ type: 'deleteNode', nodeId: props.id })
    }), [dispatch, props.id]);
    function showToolbarNow() {
        if (hideToolbarTimeoutRef.current) {
            clearTimeout(hideToolbarTimeoutRef.current);
            hideToolbarTimeoutRef.current = null;
        }
        setShowToolbar(true);
    }
    function scheduleHideToolbar() {
        if (hideToolbarTimeoutRef.current) {
            clearTimeout(hideToolbarTimeoutRef.current);
        }
        hideToolbarTimeoutRef.current = setTimeout(() => {
            setShowToolbar(false);
            hideToolbarTimeoutRef.current = null;
        }, 180);
    }
    useEffect(() => {
        return () => {
            if (hideToolbarTimeoutRef.current) {
                clearTimeout(hideToolbarTimeoutRef.current);
            }
        };
    }, []);
    const appearanceStyle = useMemo(() => {
        if (!nodeType?.appearance)
            return undefined;
        const { appearance } = nodeType;
        const s = {};
        if (appearance.minWidth !== undefined)
            s.minWidth = appearance.minWidth;
        if (appearance.minHeight !== undefined)
            s.minHeight = appearance.minHeight;
        if (appearance.borderRadius !== undefined)
            s.borderRadius = appearance.borderRadius;
        if (appearance.borderWidth !== undefined)
            s.borderWidth = appearance.borderWidth;
        if (props.selected && appearance.borderColorSelected) {
            s.borderColor = appearance.borderColorSelected;
        }
        else if (appearance.borderColor) {
            s.borderColor = appearance.borderColor;
        }
        return Object.keys(s).length > 0 ? s : undefined;
    }, [nodeType, props.selected]);
    if (!nodeType?.body || !isSchemaInput(nodeType.body)) {
        return (_jsxs("div", { className: classNames('nop-designer-node', nodeType?.appearance?.className), style: appearanceStyle, "data-selected": props.selected ? '' : undefined, onMouseEnter: showToolbarNow, onMouseLeave: scheduleHideToolbar, children: [renderPorts(nodeType?.ports), _jsx("strong", { children: data.label }), _jsx("small", { children: data.typeLabel })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: classNames('nop-designer-node', nodeType.appearance?.className), style: appearanceStyle, "data-selected": props.selected ? '' : undefined, onMouseEnter: showToolbarNow, onMouseLeave: scheduleHideToolbar, children: [renderPorts(nodeType.ports), _jsx(ClassAliasesContext.Provider, { value: config.classAliases, children: _jsx(RenderNodes, { input: nodeType.body, options: { data: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' } }) })] }), (hasQuickActions || showToolbar) && (_jsx(NodeToolbar, { isVisible: showToolbar, position: Position.Top, children: _jsx("div", { className: "nop-designer-node-toolbar flex items-center gap-1.5 p-1 rounded-xl bg-white/96 border border-border shadow-lg", onMouseEnter: showToolbarNow, onMouseLeave: scheduleHideToolbar, children: hasQuickActions ? (_jsx(ClassAliasesContext.Provider, { value: config.classAliases, children: _jsx(RenderNodes, { input: nodeType.quickActions, options: {
                                data: {
                                    ...nodeRenderData,
                                    ...actionScope
                                },
                                scopeKey: `node:${props.id}:quick-actions`,
                                pathSuffix: 'node.quickActions'
                            } }) })) : (_jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": "Edit node", className: "border-0 hover:bg-black/8 dark:hover:bg-white/10", onClick: actionScope.onEdit, children: _jsx(DesignerIcon, { icon: "pencil", className: "nop-icon nop-icon--pencil" }) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": "Duplicate node", className: "border-0 hover:bg-black/8 dark:hover:bg-white/10", onClick: actionScope.onDuplicate, children: _jsx(DesignerIcon, { icon: "copy", className: "nop-icon nop-icon--copy" }) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": "Delete node", className: "border-0 hover:bg-destructive/15 hover:text-destructive", onClick: actionScope.onDelete, children: _jsx(DesignerIcon, { icon: "trash-2", className: "nop-icon nop-icon--trash-2" }) })] })) }) }))] }));
}
