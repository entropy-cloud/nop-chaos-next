import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useDesignerContext } from './designer-context';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@nop-chaos/ui';
export function DesignerFieldRenderer(props) {
    const schemaProps = props.props;
    const label = schemaProps.label;
    const name = schemaProps.name;
    const fieldType = schemaProps.fieldType;
    const options = schemaProps.options;
    const ctx = useDesignerContext();
    const { dispatch, snapshot } = ctx;
    const { activeNode, activeEdge } = snapshot;
    const value = activeNode?.data[name] ?? activeEdge?.data[name] ?? '';
    const handleChange = useCallback((newValue) => {
        if (activeNode) {
            dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [name]: newValue } });
        }
        else if (activeEdge) {
            dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [name]: newValue } });
        }
    }, [dispatch, activeNode, activeEdge, name]);
    return (_jsxs("div", { className: "grid gap-1.5", children: [label && _jsx("label", { className: "block mb-1 text-xs font-medium text-muted-foreground", children: label }), fieldType === 'textarea' ? (_jsx(Textarea, { className: "min-h-[110px] resize-y", value: String(value), onChange: (e) => handleChange(e.target.value) })) : fieldType === 'select' && options ? (_jsxs(Select, { value: String(value), onValueChange: (nextValue) => handleChange(nextValue), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: options.map((opt) => (_jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value))) })] })) : fieldType === 'number' ? (_jsx(Input, { type: "number", value: String(value), onChange: (e) => handleChange(e.target.value) })) : (_jsx(Input, { type: "text", value: String(value), onChange: (e) => handleChange(e.target.value) }))] }));
}
