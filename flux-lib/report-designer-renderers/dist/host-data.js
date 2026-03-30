import { getFieldCount } from './helpers.js';
function getActiveSheet(snapshot, target) {
    switch (target?.kind) {
        case 'sheet':
            return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.sheetId);
        case 'cell':
            return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.cell.sheetId);
        case 'range':
            return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.range.sheetId);
        default:
            return undefined;
    }
}
export function createHostData(core, snapshot) {
    const inspectorPanels = core.getInspectorPanels();
    const fieldCount = getFieldCount(snapshot.fieldSources);
    return {
        reportDesignerCore: core,
        designer: {
            kind: snapshot.document.kind,
            documentId: snapshot.document.id,
            documentName: snapshot.document.name,
            selectionTarget: snapshot.selectionTarget,
            selectionKind: snapshot.selectionTarget?.kind,
            inspector: snapshot.inspector,
            inspectorPanels,
            fieldDrag: snapshot.fieldDrag,
            preview: snapshot.preview,
            activeMeta: snapshot.activeMeta,
            fieldSources: snapshot.fieldSources,
            fieldSourceCount: snapshot.fieldSources.length,
            fieldCount,
        },
        fieldSources: snapshot.fieldSources,
        fieldDrag: snapshot.fieldDrag,
        meta: snapshot.activeMeta,
        preview: snapshot.preview,
        inspectorPanels,
        selectionTarget: snapshot.selectionTarget,
        reportDocument: snapshot.document,
        workbook: snapshot.document.spreadsheet.workbook,
        activeSheet: getActiveSheet(snapshot, snapshot.selectionTarget),
    };
}
