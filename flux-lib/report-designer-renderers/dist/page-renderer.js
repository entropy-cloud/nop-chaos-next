import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope } from '@nop-chaos/flux-react';
import { createReportDesignerCore } from '@nop-chaos/report-designer-core';
import { renderFallbackCanvas, renderFallbackFieldPanel, renderFallbackInspector } from './fallbacks.js';
import { getFieldCount, joinClassNames } from './helpers.js';
import { createHostData } from './host-data.js';
function toActionResult(response) {
    if (response && typeof response === 'object' && 'ok' in response) {
        return {
            ok: Boolean(response.ok),
            data: response,
        };
    }
    return {
        ok: true,
        data: response,
    };
}
function createReportDesignerActionProvider(dispatch) {
    return {
        kind: 'host',
        listMethods() {
            return [];
        },
        async invoke(method, payload) {
            const args = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? payload
                : {};
            const result = await dispatch({
                type: `report-designer:${method}`,
                ...args,
            });
            return toActionResult(result);
        },
    };
}
export function ReportDesignerPageRenderer(props) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const resolvedDocument = props.props.document;
    const resolvedDesigner = props.props.designer;
    const resolvedProfile = props.props.profile;
    const resolvedAdapters = props.props.adapters;
    const core = useMemo(() => createReportDesignerCore({
        document: resolvedDocument,
        config: resolvedDesigner,
        profile: resolvedProfile,
        adapters: resolvedAdapters,
    }), [resolvedAdapters, resolvedDesigner, resolvedDocument, resolvedProfile]);
    const actionScope = useCurrentActionScope();
    const reportDesignerProvider = useMemo(() => createReportDesignerActionProvider((command) => core.dispatch(command)), [core]);
    useEffect(() => {
        if (!actionScope) {
            return;
        }
        return actionScope.registerNamespace('report-designer', reportDesignerProvider);
    }, [actionScope, reportDesignerProvider]);
    useEffect(() => {
        void core.refreshFieldSources();
    }, [core]);
    const [snapshot, setSnapshot] = useState(() => core.getSnapshot());
    useEffect(() => {
        setSnapshot(core.getSnapshot());
        return core.subscribe(() => {
            setSnapshot(core.getSnapshot());
        });
    }, [core]);
    const hostData = useMemo(() => createHostData(core, snapshot), [core, snapshot]);
    const toolbarContent = props.regions.toolbar?.render({ data: hostData });
    const fieldPanelContent = props.regions.fieldPanel?.render({ data: hostData });
    const inspectorContent = props.regions.inspector?.render({ data: hostData });
    const dialogsContent = props.regions.dialogs?.render({ data: hostData });
    const bodyContent = props.regions.body?.render({ data: hostData });
    return (_jsxs("section", { className: joinClassNames('nop-report-designer', props.meta.className), children: [_jsxs("header", { className: "nop-report-designer__header", children: [_jsxs("div", { children: [_jsx("p", { className: "nop-report-designer__eyebrow", children: "Report Designer" }), hasRendererSlotContent(titleContent) ? _jsx("h2", { children: titleContent }) : _jsx("h2", { children: snapshot.document.name })] }), _jsxs("div", { className: "nop-report-designer__status", children: [_jsxs("span", { children: ["Target: ", snapshot.selectionTarget?.kind ?? 'none'] }), _jsxs("span", { children: ["Fields: ", getFieldCount(snapshot.fieldSources)] })] })] }), hasRendererSlotContent(toolbarContent) ? (_jsx("div", { className: "nop-report-designer__toolbar", children: toolbarContent })) : null, _jsxs("div", { className: "nop-report-designer__layout", children: [_jsx("aside", { className: "nop-report-designer__field-panel", children: hasRendererSlotContent(fieldPanelContent) ? fieldPanelContent : renderFallbackFieldPanel(snapshot.fieldSources) }), _jsx("main", { className: "nop-report-designer__canvas", children: hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackCanvas(snapshot) }), _jsx("aside", { className: "nop-report-designer__inspector", children: hasRendererSlotContent(inspectorContent) ? inspectorContent : renderFallbackInspector(snapshot.activeMeta) })] }), hasRendererSlotContent(dialogsContent) ? _jsx("div", { className: "nop-report-designer__dialogs", children: dialogsContent }) : null] }));
}
