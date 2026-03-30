import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite";
import { stringify } from "yaml";
import { cn } from "../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
function JsonViewer({ data, defaultExpand = true, className }) {
    return (_jsx("div", { className: cn("json-viewer", className), children: _jsx(JsonView, { data: data, shouldExpandNode: defaultExpand ? allExpanded : undefined, style: defaultStyles }) }));
}
function DataViewer({ data, defaultExpand = true, className }) {
    const [format, setFormat] = React.useState("json");
    const yamlText = React.useMemo(() => {
        try {
            return stringify(data, { lineWidth: 0 });
        }
        catch {
            return "";
        }
    }, [data]);
    return (_jsx("div", { className: cn("flex flex-col", className), children: _jsxs(Tabs, { value: format, onValueChange: (v) => setFormat(v), children: [_jsxs(TabsList, { variant: "line", className: "shrink-0", children: [_jsx(TabsTrigger, { value: "json", children: "JSON" }), _jsx(TabsTrigger, { value: "yaml", children: "YAML" })] }), _jsx(TabsContent, { value: "json", className: "overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]", children: _jsx(JsonViewer, { data: data, defaultExpand: defaultExpand }) }), _jsx(TabsContent, { value: "yaml", className: "overflow-auto min-h-[300px] max-h-[calc(100vh-200px)]", children: _jsx("pre", { className: "font-mono text-xs leading-relaxed whitespace-pre", children: yamlText }) })] }) }));
}
export { JsonViewer, DataViewer };
