export function createEventEmitter() {
    const handlers = new Set();
    return {
        emit(event) {
            for (const handler of handlers) {
                handler(event);
            }
        },
        on(handler) {
            handlers.add(handler);
            return () => { handlers.delete(handler); };
        },
    };
}
export function deriveDesignerHostSnapshot(spreadsheet, designer, inspectorPanels) {
    return {
        ...spreadsheet,
        designer: {
            kind: designer.document.kind,
            dirty: spreadsheet.runtime.dirty,
            inspector: designer.inspector,
        },
        fieldSources: designer.fieldSources,
        fieldDrag: designer.fieldDrag,
        meta: designer.activeMeta,
        preview: {
            running: designer.preview.running,
            mode: designer.preview.mode,
        },
        inspectorPanels: inspectorPanels ?? [],
    };
}
export function createReportDesignerBridge(spreadsheetBridge, designerCore) {
    return {
        ...spreadsheetBridge,
        getDesignerSnapshot() {
            const spreadsheet = spreadsheetBridge.getSnapshot();
            const designer = designerCore.getSnapshot();
            return deriveDesignerHostSnapshot(spreadsheet, designer, designerCore.getInspectorPanels());
        },
        dispatchDesigner(command) {
            return designerCore.dispatch(command);
        },
        getDesignerCore() {
            return designerCore;
        },
    };
}
