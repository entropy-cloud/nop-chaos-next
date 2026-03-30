import { jsx as _jsx } from "react/jsx-runtime";
export function FieldLabel(props) {
    if (!props.content) {
        return null;
    }
    if (props.as === 'legend') {
        return _jsx("legend", { className: "nop-field__label", children: props.content });
    }
    return _jsx("span", { className: "nop-field__label", children: props.content });
}
