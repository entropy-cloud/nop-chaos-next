import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
export function FormRenderer(props) {
    const bodyContent = resolveRendererSlotContent(props, 'body');
    const actionsContent = resolveRendererSlotContent(props, 'actions');
    return (_jsxs("section", { className: "nop-form flex flex-col gap-4", "data-testid": props.meta.testid || undefined, children: [hasRendererSlotContent(bodyContent) ? _jsx("div", { className: "nop-form__body grid gap-4", children: bodyContent }) : null, hasRendererSlotContent(actionsContent) ? _jsx("div", { className: "nop-form__actions flex flex-wrap gap-3", children: actionsContent }) : null] }));
}
export const formRendererDefinition = {
    type: 'form',
    component: FormRenderer,
    regions: ['body', 'actions'],
    scopePolicy: 'form',
    componentRegistryPolicy: 'new'
};
