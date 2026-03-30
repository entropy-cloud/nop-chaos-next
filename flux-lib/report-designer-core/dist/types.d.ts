import type { SpreadsheetDocument, SpreadsheetCellRef, SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
export type ReportSelectionTargetKind = 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range';
export type ReportSelectionTarget = {
    kind: 'workbook';
} | {
    kind: 'sheet';
    sheetId: string;
} | {
    kind: 'row';
    sheetId: string;
    row: number;
} | {
    kind: 'column';
    sheetId: string;
    col: number;
} | {
    kind: 'cell';
    cell: SpreadsheetCellRef;
} | {
    kind: 'range';
    range: SpreadsheetRange;
};
export interface MetadataBag {
    [key: string]: unknown;
}
export interface ReportSemanticDocument {
    workbookMeta?: MetadataBag;
    sheetMeta?: Record<string, MetadataBag>;
    rowMeta?: Record<string, Record<string, MetadataBag>>;
    columnMeta?: Record<string, Record<string, MetadataBag>>;
    cellMeta?: Record<string, Record<string, MetadataBag>>;
    rangeMeta?: Record<string, RangeMetaDocument[]>;
}
export interface RangeMetaDocument {
    id: string;
    range: SpreadsheetRange;
    meta: MetadataBag;
}
export interface ReportTemplateDocument {
    id: string;
    kind: string;
    name: string;
    version: string;
    spreadsheet: SpreadsheetDocument;
    semantic?: ReportSemanticDocument;
}
export interface FieldSourceSnapshot {
    id: string;
    label: string;
    groups: FieldGroupSnapshot[];
    provider?: string;
}
export interface FieldGroupSnapshot {
    id: string;
    label: string;
    fields: FieldItemSnapshot[];
    expanded: boolean;
}
export interface FieldItemSnapshot {
    id: string;
    label: string;
    path?: string;
    fieldType?: string;
    meta?: Record<string, unknown>;
}
export interface FieldDragState {
    active: boolean;
    sourceId?: string;
    fieldId?: string;
    payload?: FieldDragPayload;
    hoverTarget?: ReportSelectionTarget;
}
export interface FieldDragPayload {
    type: string;
    sourceId: string;
    fieldId: string;
    data: Record<string, unknown>;
}
export interface InspectorRuntimeState {
    open: boolean;
    activePanelId?: string;
    providerIds: string[];
    panelIds: string[];
    loading: boolean;
    error?: unknown;
}
export interface ReportDesignerRuntimeSnapshot {
    document: ReportTemplateDocument;
    selectionTarget?: ReportSelectionTarget;
    activeMeta?: MetadataBag;
    inspector: InspectorRuntimeState;
    fieldSources: FieldSourceSnapshot[];
    fieldDrag: FieldDragState;
    preview: {
        running: boolean;
        mode?: string;
        lastResult?: unknown;
    };
}
export interface ReportDesignerConfig {
    kind?: string;
    fieldSources?: FieldSourceSnapshot[];
    maxUndoDepth?: number;
    inspector?: {
        providers: Array<{
            id: string;
            label?: string;
            match: {
                kinds: ReportSelectionTargetKind[];
            };
            body?: Record<string, unknown>;
            provider?: string;
            submitAction?: Record<string, unknown>;
            readonly?: boolean;
            badge?: string;
            group?: string;
            order?: number;
            mode?: 'tab' | 'section' | 'inline';
        }>;
    };
    preview?: {
        provider?: string;
    };
}
export declare function getDefaultSelectionTarget(document: ReportTemplateDocument): ReportSelectionTarget;
export declare function createDefaultSemantic(): ReportSemanticDocument;
export declare function createReportTemplateDocument(spreadsheet: SpreadsheetDocument, name?: string): ReportTemplateDocument;
export declare function getCellMeta(semantic: ReportSemanticDocument | undefined, sheetId: string, address: string): MetadataBag | undefined;
export declare function setCellMeta(semantic: ReportSemanticDocument, sheetId: string, address: string, meta: MetadataBag): ReportSemanticDocument;
export declare function updateCellMeta(semantic: ReportSemanticDocument, sheetId: string, address: string, patch: MetadataBag): ReportSemanticDocument;
export declare function getRowMeta(semantic: ReportSemanticDocument | undefined, sheetId: string, row: number): MetadataBag | undefined;
export declare function setRowMeta(semantic: ReportSemanticDocument, sheetId: string, row: number, meta: MetadataBag): ReportSemanticDocument;
export declare function updateRowMeta(semantic: ReportSemanticDocument, sheetId: string, row: number, patch: MetadataBag): ReportSemanticDocument;
export declare function getColumnMeta(semantic: ReportSemanticDocument | undefined, sheetId: string, col: number): MetadataBag | undefined;
export declare function setColumnMeta(semantic: ReportSemanticDocument, sheetId: string, col: number, meta: MetadataBag): ReportSemanticDocument;
export declare function updateColumnMeta(semantic: ReportSemanticDocument, sheetId: string, col: number, patch: MetadataBag): ReportSemanticDocument;
export declare function getSheetMeta(semantic: ReportSemanticDocument | undefined, sheetId: string): MetadataBag | undefined;
export declare function setSheetMeta(semantic: ReportSemanticDocument, sheetId: string, meta: MetadataBag): ReportSemanticDocument;
export declare function updateSheetMeta(semantic: ReportSemanticDocument, sheetId: string, patch: MetadataBag): ReportSemanticDocument;
export declare function setRangeMeta(semantic: ReportSemanticDocument, sheetId: string, rangeMeta: RangeMetaDocument): ReportSemanticDocument;
export declare function getTargetMeta(semantic: ReportSemanticDocument | undefined, target: ReportSelectionTarget): MetadataBag | undefined;
export declare function isSameTarget(a: ReportSelectionTarget, b: ReportSelectionTarget): boolean;
