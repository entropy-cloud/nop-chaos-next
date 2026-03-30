export function matchInspectorProviders(target, registry, context) {
    const matched = [];
    for (const provider of registry.inspectors.values()) {
        if (provider.match(target, context)) {
            matched.push(provider);
        }
    }
    matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return matched;
}
export async function resolveInspectorPanels(target, registry, metadata, designer, adapterContext) {
    const providers = matchInspectorProviders(target, registry, adapterContext);
    const panelContext = {
        target,
        metadata,
        designer,
        adapterContext,
    };
    const panels = [];
    for (const provider of providers) {
        const providerPanels = await provider.getPanels(panelContext);
        panels.push(...providerPanels);
    }
    panels.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { providers, panels };
}
export function groupPanelsByMode(panels) {
    const tabs = [];
    const sections = [];
    const inline = [];
    for (const panel of panels) {
        switch (panel.mode) {
            case 'tab':
                tabs.push(panel);
                break;
            case 'section':
                sections.push(panel);
                break;
            case 'inline':
                inline.push(panel);
                break;
            default:
                tabs.push(panel);
                break;
        }
    }
    return { tabs, sections, inline };
}
export function findDefaultActivePanel(panels) {
    if (panels.length === 0)
        return undefined;
    const nonReadonly = panels.find((p) => !p.readonly);
    return (nonReadonly ?? panels[0]).id;
}
