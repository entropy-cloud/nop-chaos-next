import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { useCurrentActionScope, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { Badge, Button, Switch } from '@nop-chaos/ui';
function readState(name, snapshot) {
    switch (name) {
        case 'canUndo':
            return snapshot.canUndo;
        case 'canRedo':
            return snapshot.canRedo;
        case 'isDirty':
            return snapshot.isDirty;
        case 'gridEnabled':
            return snapshot.gridEnabled;
        default:
            return undefined;
    }
}
function evalBooleanExpr(value, snapshot) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value !== 'string')
        return false;
    const trimmed = value.trim();
    const expr = trimmed.startsWith('${') && trimmed.endsWith('}') ? trimmed.slice(2, -1).trim() : trimmed;
    if (expr.startsWith('!')) {
        return !readState(expr.slice(1).trim(), snapshot);
    }
    return readState(expr, snapshot) === true;
}
function evalTextTemplate(template, snapshot) {
    if (!template)
        return '';
    const trimmed = template.trim();
    if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
        const expr = trimmed.slice(2, -1).trim();
        const ternaryMatch = expr.match(/^([A-Za-z0-9_.]+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'$/);
        if (ternaryMatch) {
            const [, cond, left, right] = ternaryMatch;
            return readState(cond, snapshot) === true ? left : right;
        }
    }
    return template.replace(/\$\{([^}]+)\}/g, (_full, exprSource) => {
        const expr = exprSource.trim();
        if (expr === 'doc.name')
            return snapshot.doc.name;
        if (expr === 'doc.nodes.length')
            return String(snapshot.doc.nodes.length);
        if (expr === 'doc.edges.length')
            return String(snapshot.doc.edges.length);
        if (expr === 'isDirty')
            return String(snapshot.isDirty);
        if (expr === 'canUndo')
            return String(snapshot.canUndo);
        if (expr === 'canRedo')
            return String(snapshot.canRedo);
        if (expr === 'gridEnabled')
            return String(snapshot.gridEnabled);
        return '';
    });
}
function toCommand(action) {
    switch (action) {
        case 'designer:undo':
            return { type: 'undo' };
        case 'designer:redo':
            return { type: 'redo' };
        case 'designer:toggle-grid':
            return { type: 'toggleGrid' };
        case 'designer:restore':
            return { type: 'restore' };
        case 'designer:save':
            return { type: 'save' };
        case 'designer:export':
            return { type: 'export' };
        default:
            return null;
    }
}
export function DesignerToolbarContent(props) {
    const { config, snapshot, dispatch } = useDesignerContext();
    const actionScope = useCurrentActionScope();
    const runtime = useRendererRuntime();
    const scope = useRenderScope();
    const invokeAction = useCallback(async (action) => {
        const resolved = actionScope?.resolve(action);
        if (!resolved) {
            return;
        }
        await resolved.provider.invoke(resolved.method, undefined, {
            runtime,
            scope,
            actionScope
        });
    }, [actionScope, runtime, scope]);
    const items = useMemo(() => {
        return (config.toolbar?.items ?? []).map((item, index) => ({
            key: `${item.type ?? 'item'}:${index}`,
            item
        }));
    }, [config.toolbar?.items]);
    if (items.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "nop-designer-toolbar min-h-[52px] px-3 py-2 flex flex-wrap items-center gap-2 border border-border rounded-xl shadow-sm", style: { background: 'rgba(255, 255, 255, 0.78)', backdropFilter: 'blur(20px)' }, "data-testid": "designer-toolbar", children: items.map(({ key, item }) => {
            if (item.type === 'divider') {
                return _jsx("span", { className: "w-px h-[18px] bg-border", "aria-hidden": "true" }, key);
            }
            if (item.type === 'spacer') {
                return _jsx("span", { className: "flex-1 max-[980px]:hidden", "aria-hidden": "true" }, key);
            }
            if (item.type === 'title') {
                return (_jsx("div", { className: "mr-auto flex items-center gap-2 min-w-0", children: _jsx("div", { children: _jsx("div", { className: "text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis", children: evalTextTemplate(item.body ?? item.text, snapshot) }) }) }, key));
            }
            if (item.type === 'badge') {
                const level = evalTextTemplate(item.level, snapshot);
                return (_jsx(Badge, { variant: level === 'success' ? 'success' : level === 'warning' ? 'warning' : 'secondary', children: evalTextTemplate(item.text ?? item.body, snapshot) }, key));
            }
            if (item.type === 'text') {
                return (_jsx("span", { className: "text-sm text-muted-foreground whitespace-nowrap", children: evalTextTemplate(item.body ?? item.text, snapshot) }, key));
            }
            if (item.type === 'back') {
                return (_jsx(Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": item.label ?? 'Back', className: "shrink-0", onClick: () => {
                        void invokeAction(item.action ?? 'designer:navigate-back');
                    }, children: _jsx(DesignerIcon, { icon: "arrow-left", className: "nop-icon nop-icon--arrow-left" }) }, key));
            }
            if (item.type === 'button') {
                const command = toCommand(item.action);
                const disabled = evalBooleanExpr(item.disabled, snapshot);
                const active = evalBooleanExpr(item.active, snapshot) || (item.action === 'designer:export' && props.exportActive === true);
                const isPrimary = item.variant === 'primary';
                const variant = active || isPrimary ? 'default' : 'outline';
                return (_jsxs(Button, { type: "button", variant: variant, size: "sm", disabled: disabled, onClick: () => {
                        if (item.action === 'designer:autoLayout') {
                            props.onAutoLayout?.();
                            return;
                        }
                        if (command) {
                            if (command.type === 'export' && props.onExportToggle) {
                                props.onExportToggle();
                                return;
                            }
                            dispatch(command);
                        }
                    }, children: [item.icon ? _jsx(DesignerIcon, { icon: item.icon, className: `nop-icon nop-icon--${item.icon}` }) : null, item.label ? _jsx("span", { children: item.label }) : null] }, key));
            }
            if (item.type === 'switch') {
                const command = toCommand(item.action);
                const disabled = evalBooleanExpr(item.disabled, snapshot);
                const checked = evalBooleanExpr(item.active, snapshot);
                return (_jsxs("label", { className: "inline-flex items-center gap-1.5 cursor-pointer select-none", children: [item.label ? _jsx("span", { className: "text-sm text-muted-foreground whitespace-nowrap", children: item.label }) : null, _jsx(Switch, { size: "sm", checked: checked, disabled: disabled, onCheckedChange: () => {
                                if (command)
                                    dispatch(command);
                            } })] }, key));
            }
            return null;
        }) }));
}
