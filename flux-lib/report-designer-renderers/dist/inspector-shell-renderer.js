import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo } from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent, useRenderScope } from '@nop-chaos/flux-react';
import { formatSelectionLabel, joinClassNames } from './helpers.js';
import { renderFallbackInspector } from './fallbacks.js';
export function ReportInspectorShellRenderer(props) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const scope = useRenderScope();
    const scopeData = scope.readOwn();
    const target = scopeData.selectionTarget;
    const inspector = scopeData.inspector;
    const panels = useMemo(() => (Array.isArray(scopeData.inspectorPanels) ? scopeData.inspectorPanels : [])
        .slice()
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)), [scopeData.inspectorPanels]);
    const tabPanels = useMemo(() => panels.filter((panel) => panel.mode == null || panel.mode === 'tab'), [panels]);
    const sectionPanels = useMemo(() => panels.filter((panel) => panel.mode === 'section'), [panels]);
    const inlinePanels = useMemo(() => panels.filter((panel) => panel.mode === 'inline'), [panels]);
    const [activePanelId, setActivePanelId] = React.useState(inspector?.activePanelId ?? tabPanels[0]?.id ?? panels[0]?.id);
    const [submittingPanelId, setSubmittingPanelId] = React.useState();
    const [submitResult, setSubmitResult] = React.useState();
    useEffect(() => {
        const nextActivePanelId = inspector?.activePanelId ?? tabPanels[0]?.id ?? panels[0]?.id;
        setActivePanelId((current) => {
            if (current && tabPanels.some((panel) => panel.id === current))
                return current;
            return current === nextActivePanelId ? current : nextActivePanelId;
        });
    }, [inspector?.activePanelId, panels, tabPanels]);
    const activePanel = tabPanels.find((panel) => panel.id === activePanelId) ?? tabPanels[0];
    const inspectorErrorLabel = inspector?.error != null ? String(inspector.error) : undefined;
    const groupedSectionPanels = useMemo(() => {
        const grouped = new Map();
        for (const panel of sectionPanels) {
            const groupKey = panel.group ?? 'General';
            const existing = grouped.get(groupKey);
            if (existing) {
                existing.push(panel);
            }
            else {
                grouped.set(groupKey, [panel]);
            }
        }
        return Array.from(grouped.entries()).map(([group, groupedPanels]) => ({ group, panels: groupedPanels }));
    }, [sectionPanels]);
    const groupedInlinePanels = useMemo(() => {
        const grouped = new Map();
        for (const panel of inlinePanels) {
            const groupKey = panel.group ?? 'Inline';
            const existing = grouped.get(groupKey);
            if (existing) {
                existing.push(panel);
            }
            else {
                grouped.set(groupKey, [panel]);
            }
        }
        return Array.from(grouped.entries()).map(([group, groupedPanels]) => ({ group, panels: groupedPanels }));
    }, [inlinePanels]);
    async function handleSubmit(panel) {
        if (!panel.submitAction)
            return;
        setSubmittingPanelId(panel.id);
        setSubmitResult(undefined);
        try {
            const result = await props.helpers.dispatch(panel.submitAction, { scope });
            setSubmitResult(result);
        }
        catch (error) {
            setSubmitResult({ ok: false, error });
        }
        finally {
            setSubmittingPanelId((current) => (current === panel.id ? undefined : current));
        }
    }
    function renderPanelChrome(panel, options) {
        const showHeader = options?.showHeader ?? true;
        return (_jsxs("div", { className: "nop-report-designer__stack", children: [showHeader ? (_jsxs("div", { className: "nop-report-designer__section-header", children: [_jsx("h4", { children: panel.title }), _jsx("span", { children: panel.badge ? `${panel.badge}${panel.readonly ? ' | Read only' : ''}` : panel.readonly ? 'Read only' : '' })] })) : null, props.helpers.render(panel.body, {
                    scope,
                    pathSuffix: `inspector-panels.${panel.id}`,
                }), panel.submitAction && !panel.readonly ? (_jsxs("div", { className: "nop-report-designer__toolbar", children: [_jsx("button", { type: "button", onClick: () => void handleSubmit(panel), disabled: submittingPanelId === panel.id, children: submittingPanelId === panel.id ? 'Saving...' : String(props.props.saveLabel ?? 'Save Panel') }), submitResult && panel.id === submittingPanelId ? (submitResult.ok ? _jsx("span", { children: "Saved" }) : submitResult.error ? _jsx("span", { children: "Save failed" }) : null) : null] })) : panel.readonly ? (_jsx("p", { className: "nop-report-designer__empty", children: "This panel is read only." })) : null] }, panel.id));
    }
    return (_jsxs("section", { className: joinClassNames('nop-report-designer__inspector-shell', props.meta.className), children: [hasRendererSlotContent(titleContent) ? (_jsxs("header", { className: "nop-report-designer__section-header", children: [_jsx("h3", { children: titleContent }), _jsx("span", { children: formatSelectionLabel(target) })] })) : null, !target ? (_jsx("p", { className: "nop-report-designer__empty", children: String(props.props.noSelectionLabel ?? 'Select a target to inspect.') })) : inspector?.loading ? (_jsx("p", { className: "nop-report-designer__empty", children: "Loading inspector panels..." })) : inspector?.error ? (_jsxs("div", { className: "nop-report-designer__stack", children: [_jsx("p", { className: "nop-report-designer__empty", children: String(props.props.errorLabel ?? 'Failed to load inspector panels.') }), _jsx("p", { className: "nop-report-designer__empty", children: inspectorErrorLabel })] })) : panels.length === 0 ? (_jsxs("div", { className: "nop-report-designer__stack", children: [_jsx("p", { className: "nop-report-designer__empty", children: String(props.props.emptyLabel ?? 'No inspector panels available.') }), scopeData.meta ? renderFallbackInspector(scopeData.meta) : null] })) : (_jsxs("div", { className: "nop-report-designer__stack", children: [tabPanels.length > 1 ? (_jsx("div", { className: "nop-report-designer__toolbar", children: tabPanels.map((panel) => (_jsxs("button", { type: "button", className: "nop-report-designer__tab", onClick: () => setActivePanelId(panel.id), children: [_jsx("span", { children: panel.title }), panel.badge ? _jsx("span", { children: panel.badge }) : null, panel.readonly ? _jsx("span", { children: "Read only" }) : null] }, panel.id))) })) : null, activePanel ? renderPanelChrome(activePanel, { showHeader: tabPanels.length <= 1 }) : null, groupedSectionPanels.map((group) => (_jsxs("section", { className: "nop-report-designer__stack", children: [_jsx("div", { className: "nop-report-designer__section-header", children: _jsx("h4", { children: group.group }) }), group.panels.map((panel) => renderPanelChrome(panel))] }, `section-group-${group.group}`))), groupedInlinePanels.length > 0 ? (_jsx("div", { className: "nop-report-designer__stack", children: groupedInlinePanels.map((group) => (_jsxs("section", { className: "nop-report-designer__stack", children: [_jsx("div", { className: "nop-report-designer__section-header", children: _jsx("h4", { children: group.group }) }), group.panels.map((panel) => renderPanelChrome(panel, { showHeader: false }))] }, `inline-group-${group.group}`))) })) : null] }))] }));
}
