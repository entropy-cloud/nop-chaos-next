import React, { useEffect, useMemo, useState } from 'react';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
export const DesignerContext = React.createContext(null);
export function useDesignerContext() {
    const ctx = React.useContext(DesignerContext);
    if (!ctx) {
        throw new Error('Designer components must be used within a designer-page');
    }
    return ctx;
}
export function useDesignerSnapshot(core) {
    const [snapshot, setSnapshot] = useState(() => core.getSnapshot());
    useEffect(() => {
        setSnapshot(core.getSnapshot());
        const unsub = core.subscribe(() => {
            setSnapshot(core.getSnapshot());
        });
        return unsub;
    }, [core]);
    return snapshot;
}
export function notifyCommandFailure(notify, error, reason) {
    if (!error || reason === 'unchanged') {
        return;
    }
    notify?.('warning', error);
}
export function toActionResult(result) {
    return {
        ok: result.ok,
        data: result.exported ?? result.data,
        error: result.error ? new Error(result.error) : undefined
    };
}
export function buildDesignerScopeData(input) {
    const { snapshot, config, core } = input;
    const selectionKind = snapshot.activeNode ? 'node' : snapshot.activeEdge ? 'edge' : 'none';
    const nodeIds = snapshot.selection.selectedNodeIds;
    const edgeIds = snapshot.selection.selectedEdgeIds;
    return {
        doc: snapshot.doc,
        selection: {
            kind: selectionKind,
            count: nodeIds.length + edgeIds.length,
            nodeIds,
            edgeIds,
            selectedNodeIds: nodeIds,
            selectedEdgeIds: edgeIds,
            activeNodeId: snapshot.selection.activeNodeId,
            activeEdgeId: snapshot.selection.activeEdgeId
        },
        activeNode: snapshot.activeNode,
        activeEdge: snapshot.activeEdge,
        runtime: {
            canUndo: snapshot.canUndo,
            canRedo: snapshot.canRedo,
            dirty: snapshot.isDirty,
            isDirty: snapshot.isDirty,
            gridEnabled: snapshot.gridEnabled,
            zoom: snapshot.viewport.zoom,
            viewport: snapshot.viewport
        },
        palette: config.palette,
        nodeTypes: config.nodeTypes,
        edgeTypes: config.edgeTypes,
        designerCore: core
    };
}
export function useDesignerHostScope(input) {
    const runtime = useRendererRuntime();
    const parentScope = useRenderScope();
    const scopeData = useMemo(() => buildDesignerScopeData(input), [input]);
    const scopeRef = React.useRef(undefined);
    if (!scopeRef.current || scopeRef.current.parentScope !== parentScope || scopeRef.current.path !== input.path) {
        scopeRef.current = {
            parentScope,
            path: input.path,
            scope: runtime.createChildScope(parentScope, scopeData, {
                scopeKey: `${input.path}:designer-host`,
                pathSuffix: 'designer'
            })
        };
    }
    else {
        scopeRef.current.scope.store?.setSnapshot(scopeData);
    }
    return scopeRef.current.scope;
}
export function useNormalizedConfig() {
    const { core } = useDesignerContext();
    return core.getConfig();
}
export function useNodeTypeConfig(typeId) {
    const normalizedConfig = useNormalizedConfig();
    return normalizedConfig.nodeTypes.get(typeId);
}
export function useEdgeTypeConfig(typeId) {
    const normalizedConfig = useNormalizedConfig();
    return normalizedConfig.edgeTypes.get(typeId);
}
