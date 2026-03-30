import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { classNames, resolveDirection, resolveGap } from './utils';
export function ContainerRenderer(props) {
    const direction = props.props.direction === 'column' ? 'column' : 'row';
    const wrap = props.props.wrap === true;
    const align = props.props.align === 'start' ||
        props.props.align === 'center' ||
        props.props.align === 'end' ||
        props.props.align === 'stretch'
        ? props.props.align
        : undefined;
    const gap = resolveGap(props.props.gap);
    const headerContent = resolveRendererSlotContent(props, 'header');
    const footerContent = resolveRendererSlotContent(props, 'footer');
    const bodyContent = props.regions.body?.render();
    const useFlexChild = wrap || align !== undefined || (gap.className || gap.style) || direction !== 'row';
    return (_jsxs("div", { className: classNames('nop-container', props.meta.className), "data-testid": props.meta.testid || undefined, children: [hasRendererSlotContent(headerContent) ? _jsx("div", { className: "nop-container__header", children: headerContent }) : null, useFlexChild ? (_jsx("div", { className: classNames('flex', resolveDirection(direction), wrap && 'flex-wrap', align === 'center' && 'items-center justify-center', align === 'start' && 'items-start justify-start', align === 'end' && 'items-end justify-end', align === 'stretch' && 'items-stretch', gap.className), style: gap.style, children: bodyContent })) : (bodyContent), hasRendererSlotContent(footerContent) ? _jsx("div", { className: "nop-container__footer", children: footerContent }) : null] }));
}
