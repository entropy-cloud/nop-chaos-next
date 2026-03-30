import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
export * from './schemas';
export { TableRenderer } from './table-renderer';
export { DataSourceRenderer } from './data-source-renderer';
export declare const dataRendererDefinitions: RendererDefinition[];
export declare function registerDataRenderers(registry: RendererRegistry): RendererRegistry;
