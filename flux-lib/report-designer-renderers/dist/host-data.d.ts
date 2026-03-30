import type { FieldSourceSnapshot, ReportDesignerCore, ReportDesignerRuntimeSnapshot, ReportSelectionTarget } from '@nop-chaos/report-designer-core';
export interface ReportDesignerHostData {
    reportDesignerCore: ReportDesignerCore;
    designer: {
        kind: string;
        documentId: string;
        documentName: string;
        selectionTarget: ReportSelectionTarget | undefined;
        selectionKind: ReportSelectionTarget['kind'] | undefined;
        inspector: ReportDesignerRuntimeSnapshot['inspector'];
        inspectorPanels: ReturnType<ReportDesignerCore['getInspectorPanels']>;
        fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
        preview: ReportDesignerRuntimeSnapshot['preview'];
        activeMeta: ReportDesignerRuntimeSnapshot['activeMeta'];
        fieldSources: FieldSourceSnapshot[];
        fieldSourceCount: number;
        fieldCount: number;
    };
    fieldSources: FieldSourceSnapshot[];
    fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
    meta: ReportDesignerRuntimeSnapshot['activeMeta'];
    preview: ReportDesignerRuntimeSnapshot['preview'];
    inspectorPanels: ReturnType<ReportDesignerCore['getInspectorPanels']>;
    selectionTarget: ReportSelectionTarget | undefined;
    reportDocument: ReportDesignerRuntimeSnapshot['document'];
    workbook: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook'];
    activeSheet: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook']['sheets'][number] | undefined;
}
export declare function createHostData(core: ReportDesignerCore, snapshot: ReportDesignerRuntimeSnapshot): ReportDesignerHostData;
