import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '@nop-chaos/spreadsheet-renderers';
import type { ReportDesignerCore, ReportDesignerRuntimeSnapshot, ReportDesignerCommand, ReportDesignerCommandResult, InspectorRuntimeState, InspectorPanelDescriptor, FieldSourceSnapshot, FieldDragState, MetadataBag } from '@nop-chaos/report-designer-core';
export interface ReportDesignerHostSnapshot extends SpreadsheetHostSnapshot {
    designer: {
        kind: string;
        dirty: boolean;
        inspector: InspectorRuntimeState;
    };
    fieldSources: FieldSourceSnapshot[];
    fieldDrag: FieldDragState;
    meta?: MetadataBag;
    preview: {
        running: boolean;
        mode?: string;
    };
    inspectorPanels: InspectorPanelDescriptor[];
}
export interface ReportDesignerBridge extends SpreadsheetBridge {
    getDesignerSnapshot(): ReportDesignerHostSnapshot;
    dispatchDesigner(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
    getDesignerCore(): ReportDesignerCore;
}
export type ReportDesignerEvent = {
    type: 'report-designer:fieldDragStart';
    payload: FieldDragState;
} | {
    type: 'report-designer:fieldDragEnd';
    payload: FieldDragState;
} | {
    type: 'report-designer:selectionTargetChanged';
    payload: import('@nop-chaos/report-designer-core').ReportSelectionTarget | undefined;
} | {
    type: 'report-designer:previewStarted';
    payload: {
        mode?: string;
    };
} | {
    type: 'report-designer:previewFinished';
    payload: import('@nop-chaos/report-designer-core').PreviewResult;
};
export interface ReportDesignerEventEmitter {
    emit(event: ReportDesignerEvent): void;
    on(handler: (event: ReportDesignerEvent) => void): () => void;
}
export declare function createEventEmitter(): ReportDesignerEventEmitter;
export declare function deriveDesignerHostSnapshot(spreadsheet: SpreadsheetHostSnapshot, designer: ReportDesignerRuntimeSnapshot, inspectorPanels?: InspectorPanelDescriptor[]): ReportDesignerHostSnapshot;
export declare function createReportDesignerBridge(spreadsheetBridge: SpreadsheetBridge, designerCore: ReportDesignerCore): ReportDesignerBridge;
