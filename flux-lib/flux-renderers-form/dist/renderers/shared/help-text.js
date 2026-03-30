import { jsx as _jsx } from "react/jsx-runtime";
export function FieldHelpText(props) {
    if (!props.children) {
        return null;
    }
    return _jsx("span", { className: "nop-field__hint", children: props.children });
}
