import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from '../../lib/i18n.js';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, MoreHorizontalIcon } from 'lucide-react';
function Pagination({ className, ...props }) {
    return (_jsx("nav", { "aria-label": "pagination", "data-slot": "pagination", className: cn('nop-pagination ', 'mx-auto flex w-full justify-center', className), ...props }));
}
function PaginationContent({ className, ...props }) {
    return (_jsx("ul", { "data-slot": "pagination-content", className: cn('nop-pagination ', 'flex items-center gap-0.5', className), ...props }));
}
function PaginationItem({ ...props }) {
    return _jsx("li", { "data-slot": "pagination-item", ...props });
}
function PaginationLink({ className, isActive, size = 'icon', ...props }) {
    return (_jsx(Button, { variant: isActive ? 'outline' : 'ghost', size: size, className: cn('nop-pagination ', className), nativeButton: false, render: _jsx("a", { "aria-current": isActive ? 'page' : undefined, "data-slot": "pagination-link", "data-active": isActive, ...props }) }));
}
function PaginationPrevious({ className, title, text = t('flux.pagination.previous'), ...props }) {
    return (_jsx(PaginationLink, { "aria-label": text, title: title ?? text, size: "default", className: cn('nop-pagination ', 'pl-1.5!', className), ...props, children: _jsx(ChevronLeftIcon, { "data-icon": "inline-start" }) }));
}
function PaginationFirst({ className, title, text = t('flux.pagination.first'), ...props }) {
    return (_jsx(PaginationLink, { "aria-label": text, title: title ?? text, size: "default", className: cn('nop-pagination ', 'pl-1.5!', className), ...props, children: _jsx(ChevronsLeftIcon, { "data-icon": "inline-start" }) }));
}
function PaginationLast({ className, title, text = t('flux.pagination.last'), ...props }) {
    return (_jsx(PaginationLink, { "aria-label": text, title: title ?? text, size: "default", className: cn('nop-pagination ', 'pr-1.5!', className), ...props, children: _jsx(ChevronsRightIcon, { "data-icon": "inline-end" }) }));
}
function PaginationNext({ className, title, text = t('flux.pagination.next'), ...props }) {
    return (_jsx(PaginationLink, { "aria-label": text, title: title ?? text, size: "default", className: cn('nop-pagination ', 'pr-1.5!', className), ...props, children: _jsx(ChevronRightIcon, { "data-icon": "inline-end" }) }));
}
function PaginationEllipsis({ className, ...props }) {
    return (_jsxs("span", { "aria-hidden": true, "data-slot": "pagination-ellipsis", className: cn('nop-pagination ', "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [_jsx(MoreHorizontalIcon, {}), _jsx("span", { className: "sr-only", children: t('flux.pagination.morePages') })] }));
}
export { Pagination, PaginationContent, PaginationEllipsis, PaginationFirst, PaginationItem, PaginationLast, PaginationLink, PaginationNext, PaginationPrevious, };
