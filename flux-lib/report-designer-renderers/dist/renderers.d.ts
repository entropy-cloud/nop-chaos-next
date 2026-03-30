import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import type { ReportDesignerPageSchemaInput, ReportDesignerPageSchema } from './types.js';
export { defineReportDesignerPageSchema } from './types.js';
export type { ReportDesignerPageSchemaInput, ReportDesignerPageSchema, };
export declare const reportDesignerRendererDefinitions: RendererDefinition[];
export declare function registerReportDesignerRenderers(registry: RendererRegistry): RendererRegistry;
