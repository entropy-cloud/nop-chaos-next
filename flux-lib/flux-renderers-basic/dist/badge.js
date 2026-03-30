import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from '@nop-chaos/ui';
export function BadgeRenderer(props) {
    const text = props.props.text;
    const variant = props.props.level === 'success'
        ? 'success'
        : props.props.level === 'warning'
            ? 'warning'
            : props.props.level === 'danger'
                ? 'destructive'
                : 'secondary';
    return _jsx(Badge, { variant: variant, className: props.meta.className, "data-testid": props.meta.testid || undefined, children: String(text ?? '') });
}
