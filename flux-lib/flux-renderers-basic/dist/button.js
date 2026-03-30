import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from '@nop-chaos/ui';
export function ButtonRenderer(props) {
    const label = props.props.label;
    const variant = props.props.variant === 'danger' ? 'destructive' : props.props.variant === 'ghost' ? 'ghost' : 'default';
    const size = props.props.size === 'sm' || props.props.size === 'lg' ? props.props.size : 'default';
    return (_jsx(Button, { variant: variant, size: size, className: props.meta.className, type: "button", "data-testid": props.meta.testid || undefined, onClick: () => void props.events.onClick?.(), disabled: props.meta.disabled, children: String(label ?? props.meta.label ?? 'Button') }));
}
