import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasRendererSlotContent, resolveRendererSlotContent, useRenderScope } from '@nop-chaos/flux-react';
import { getFieldCount, joinClassNames } from './helpers.js';
import { renderFieldSourceSections } from './fallbacks.js';
export function ReportFieldPanelRenderer(props) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const scope = useRenderScope();
    const scopeData = scope.readOwn();
    const fieldSources = Array.isArray(scopeData.fieldSources) ? scopeData.fieldSources : [];
    const designer = scopeData.designer;
    return (_jsxs("section", { className: joinClassNames('nop-report-designer__field-panel-shell', props.meta.className), children: [hasRendererSlotContent(titleContent) ? (_jsxs("header", { className: "nop-report-designer__section-header", children: [_jsx("h3", { children: titleContent }), _jsxs("span", { children: [designer?.fieldCount ?? getFieldCount(fieldSources), " fields"] })] })) : designer?.documentName ? (_jsxs("header", { className: "nop-report-designer__section-header", children: [_jsx("h3", { children: designer.documentName }), _jsxs("span", { children: [designer?.fieldCount ?? getFieldCount(fieldSources), " fields"] })] })) : null, fieldSources.length === 0 ? (_jsx("p", { className: "nop-report-designer__empty", children: String(props.props.emptyLabel ?? 'No field sources registered.') })) : (renderFieldSourceSections(fieldSources))] }));
}
