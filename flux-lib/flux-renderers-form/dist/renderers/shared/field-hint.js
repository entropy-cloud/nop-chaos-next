import { jsx as _jsx } from "react/jsx-runtime";
import { FieldError } from './error';
import { FieldHelpText } from './help-text';
export function FieldHint(props) {
    if (props.errorMessage && props.showError) {
        return _jsx(FieldError, { children: props.errorMessage });
    }
    if (props.validating) {
        return _jsx(FieldHelpText, { children: "Validating..." });
    }
    return null;
}
