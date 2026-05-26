import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import { stringify } from 'yaml';
import { Tabs, TabsList, TabsTrigger } from './tabs.js';
import { cn } from '../../lib/utils.js';
function JsonViewer({ data, defaultExpand = true, className }) {
    return (_jsx("div", { className: cn('json-viewer', className), children: _jsx(JsonView, { data: data, shouldExpandNode: defaultExpand ? allExpanded : undefined, style: defaultStyles }) }));
}
function DataViewer({ data, defaultExpand = true, className }) {
    const [format, setFormat] = React.useState('json');
    const yamlText = (() => {
        try {
            return stringify(data, { lineWidth: 0 });
        }
        catch {
            return '';
        }
    })();
    return (_jsx("div", { className: cn('flex flex-col', className), children: _jsxs("div", { className: "flex flex-col space-y-2", children: [_jsx(Tabs, { value: format, onValueChange: (value) => setFormat(value), children: _jsxs(TabsList, { className: "grid w-full grid-cols-2 gap-2", children: [_jsx(TabsTrigger, { value: "json", children: "JSON" }), _jsx(TabsTrigger, { value: "yaml", children: "YAML" })] }) }), _jsx("div", { className: "overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]", children: format === 'json' ? (_jsx(JsonViewer, { data: data, defaultExpand: defaultExpand })) : (_jsx("pre", { className: "font-mono text-xs leading-relaxed whitespace-pre", children: yamlText })) })] }) }));
}
export { JsonViewer, DataViewer };
