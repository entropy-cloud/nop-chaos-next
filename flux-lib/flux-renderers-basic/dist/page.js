import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { classNames } from './utils';
export function PageRenderer(props) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const headerContent = resolveRendererSlotContent(props, 'header');
    const footerContent = resolveRendererSlotContent(props, 'footer');
    return (_jsxs("section", { className: classNames('nop-page', props.meta.className), "data-testid": props.meta.testid || undefined, children: [hasRendererSlotContent(titleContent) ? (_jsx("header", { className: "nop-page__header", children: _jsx("h2", { children: titleContent }) })) : null, hasRendererSlotContent(headerContent) ? (_jsx("div", { className: "nop-page__toolbar", children: headerContent })) : null, _jsx("div", { className: "nop-page__body", children: props.regions.body?.render() }), hasRendererSlotContent(footerContent) ? (_jsx("footer", { className: "nop-page__footer", children: footerContent })) : null] }));
}
