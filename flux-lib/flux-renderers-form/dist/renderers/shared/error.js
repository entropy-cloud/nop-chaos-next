import { jsx as _jsx } from "react/jsx-runtime";
export function FieldError(props) {
    if (!props.children) {
        return null;
    }
    return _jsx("span", { className: "nop-field__error", children: props.children });
}
