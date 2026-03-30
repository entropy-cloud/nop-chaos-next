import type { FieldSourceSnapshot, ReportSelectionTarget } from '@nop-chaos/report-designer-core';
export declare function joinClassNames(...parts: Array<string | undefined | false>): string;
export declare function getFieldCount(fieldSources: FieldSourceSnapshot[]): number;
export declare function formatSelectionLabel(target: ReportSelectionTarget | undefined): string;
export declare function formatMetadataValue(value: unknown): string;
