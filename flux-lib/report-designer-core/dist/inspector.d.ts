import type { ReportSelectionTarget, MetadataBag, ReportDesignerRuntimeSnapshot } from './types.js';
import type { ReportDesignerAdapterContext, ReportDesignerAdapterRegistry, InspectorPanelDescriptor, InspectorProvider } from './adapters.js';
export interface InspectorMatchResult {
    providers: InspectorProvider[];
    panels: InspectorPanelDescriptor[];
}
export declare function matchInspectorProviders(target: ReportSelectionTarget, registry: ReportDesignerAdapterRegistry, context: ReportDesignerAdapterContext): InspectorProvider[];
export declare function resolveInspectorPanels(target: ReportSelectionTarget, registry: ReportDesignerAdapterRegistry, metadata: MetadataBag | undefined, designer: ReportDesignerRuntimeSnapshot, adapterContext: ReportDesignerAdapterContext): Promise<InspectorMatchResult>;
export declare function groupPanelsByMode(panels: InspectorPanelDescriptor[]): {
    tabs: InspectorPanelDescriptor[];
    sections: InspectorPanelDescriptor[];
    inline: InspectorPanelDescriptor[];
};
export declare function findDefaultActivePanel(panels: InspectorPanelDescriptor[]): string | undefined;
