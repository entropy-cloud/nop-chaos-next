import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatMetadataValue, getFieldCount } from './helpers.js';
export function renderFieldSourceSections(fieldSources) {
    return (_jsx("div", { className: "nop-report-designer__stack", children: fieldSources.map((source) => (_jsxs("section", { className: "nop-report-designer__section", children: [_jsx("h4", { children: source.label }), source.groups.map((group) => (_jsxs("div", { className: "nop-report-designer__group", children: [_jsx("strong", { children: group.label }), _jsx("ul", { children: group.fields.map((field) => (_jsx("li", { children: field.label }, field.id))) })] }, group.id)))] }, source.id))) }));
}
export function renderFallbackFieldPanel(fieldSources) {
    if (fieldSources.length === 0) {
        return _jsx("p", { className: "nop-report-designer__empty", children: "No field sources registered." });
    }
    return renderFieldSourceSections(fieldSources);
}
export function renderFallbackInspector(meta) {
    if (!meta || Object.keys(meta).length === 0) {
        return _jsx("p", { className: "nop-report-designer__empty", children: "No metadata for the current target." });
    }
    return (_jsx("dl", { className: "nop-report-designer__meta-list", children: Object.entries(meta).map(([key, value]) => (_jsxs("div", { className: "nop-report-designer__meta-row", children: [_jsx("dt", { children: key }), _jsx("dd", { children: formatMetadataValue(value) })] }, key))) }));
}
export function renderFallbackCanvas(snapshot) {
    return (_jsxs("div", { className: "nop-report-designer__canvas-fallback", children: [_jsx("p", { className: "nop-report-designer__eyebrow", children: "Report Designer Core" }), _jsx("h3", { children: snapshot.document.name }), _jsxs("p", { children: ["Target: ", _jsx("strong", { children: snapshot.selectionTarget?.kind ?? 'none' })] }), _jsxs("p", { children: ["Preview: ", _jsx("strong", { children: snapshot.preview.lastResult ? 'ready' : snapshot.preview.running ? 'running' : 'idle' })] }), _jsxs("p", { children: ["Fields: ", _jsx("strong", { children: getFieldCount(snapshot.fieldSources) })] })] }));
}
