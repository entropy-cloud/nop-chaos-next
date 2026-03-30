import type { FieldSourceSnapshot, MetadataBag, ReportDesignerRuntimeSnapshot } from '@nop-chaos/report-designer-core';
export declare function renderFieldSourceSections(fieldSources: FieldSourceSnapshot[]): import("react/jsx-runtime").JSX.Element;
export declare function renderFallbackFieldPanel(fieldSources: FieldSourceSnapshot[]): import("react/jsx-runtime").JSX.Element;
export declare function renderFallbackInspector(meta: MetadataBag | undefined): import("react/jsx-runtime").JSX.Element;
export declare function renderFallbackCanvas(snapshot: ReportDesignerRuntimeSnapshot): import("react/jsx-runtime").JSX.Element;
