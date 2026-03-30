import type { ReportDesignerConfig, ReportTemplateDocument, ReportDesignerRuntimeSnapshot, ReportSelectionTarget, MetadataBag, FieldSourceSnapshot } from './types.js';
import type { ReportDesignerCommand, ReportDesignerCommandResult } from './commands.js';
import type { ReportDesignerAdapterRegistry, InspectorProvider, InspectorPanelDescriptor, FieldDropAdapter, ReportDesignerProfile } from './adapters.js';
export interface ReportDesignerCore {
    getSnapshot(): ReportDesignerRuntimeSnapshot;
    subscribe(listener: () => void): () => void;
    dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
    getMetadata(target: ReportSelectionTarget): MetadataBag | undefined;
    setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void;
    setSelectionTarget(target?: ReportSelectionTarget): Promise<void>;
    getInspectorPanels(): InspectorPanelDescriptor[];
    refreshFieldSources(): Promise<FieldSourceSnapshot[]>;
    exportDocument(): ReportTemplateDocument;
    getAdapterRegistry(): ReportDesignerAdapterRegistry;
    registerFieldSource(provider: import('./adapters.js').FieldSourceProvider): void;
    registerInspector(provider: InspectorProvider): void;
    registerFieldDrop(adapter: FieldDropAdapter): void;
    registerPreview(adapter: import('./adapters.js').PreviewAdapter): void;
    registerCodec(adapter: import('./adapters.js').TemplateCodecAdapter): void;
}
export interface CreateReportDesignerCoreOptions {
    document: ReportTemplateDocument;
    config: ReportDesignerConfig;
    adapters?: Partial<ReportDesignerAdapterRegistry>;
    profile?: ReportDesignerProfile;
}
export declare function createReportDesignerCore(options: CreateReportDesignerCoreOptions): ReportDesignerCore;
