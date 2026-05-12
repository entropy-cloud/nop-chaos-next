'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { t } from '../../lib/i18n.js';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { XIcon } from 'lucide-react';
import { useDialogDrag } from './use-dialog-drag.js';
const DialogContext = React.createContext({
    draggable: false,
    noOverlay: false,
    noCenter: false,
    closeOnOutsideClick: true,
    containerElement: null,
});
function Dialog({ draggable = true, noOverlay = false, noCenter = false, closeOnOutsideClick = true, containerElement, ...props }) {
    const contextValue = React.useMemo(() => ({
        draggable,
        noOverlay,
        noCenter,
        closeOnOutsideClick,
        containerElement: containerElement ?? null,
    }), [draggable, noOverlay, noCenter, closeOnOutsideClick, containerElement]);
    return (_jsx(DialogContext.Provider, { value: contextValue, children: _jsx(DialogPrimitive.Root, { "data-slot": "dialog", ...props }) }));
}
function DialogTrigger({ ...props }) {
    return _jsx(DialogPrimitive.Trigger, { "data-slot": "dialog-trigger", ...props });
}
function DialogPortal({ ...props }) {
    return _jsx(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props });
}
function DialogClose({ ...props }) {
    return _jsx(DialogPrimitive.Close, { "data-slot": "dialog-close", ...props });
}
function DialogOverlay({ className, ...props }) {
    const { containerElement } = React.useContext(DialogContext);
    const isContained = containerElement != null;
    return (_jsx(DialogPrimitive.Backdrop, { "data-slot": "dialog-overlay", className: cn('isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0', isContained ? 'absolute inset-0' : 'fixed inset-0', className), ...props }));
}
const DialogContent = React.forwardRef(function DialogContent({ className, children, showCloseButton = true, offsetRef, baseTransform, size = 'default', ...props }, ref) {
    const { draggable, noOverlay, noCenter, containerElement } = React.useContext(DialogContext);
    const isContained = containerElement != null;
    const effectiveBaseTransform = noCenter
        ? isContained
            ? ''
            : ''
        : isContained
            ? 'translate(-50%, -50%)'
            : (baseTransform ?? 'translate(-50%, -50%)');
    const { contentRef, handlePointerDown } = useDialogDrag({ enabled: draggable, offsetRef, baseTransform: effectiveBaseTransform }, ref);
    return (_jsxs(DialogPortal, { "data-slot": "dialog-portal", container: containerElement ?? undefined, children: [!noOverlay && _jsx(DialogOverlay, {}), _jsxs(DialogPrimitive.Popup, { ref: contentRef, "data-slot": "dialog-content", "data-size": size, className: cn('z-50 flex w-full max-w-[calc(100%-2rem)] flex-col rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0', 'data-[size=sm]:sm:max-w-sm data-[size=default]:sm:max-w-lg data-[size=lg]:sm:max-w-2xl', isContained ? 'absolute' : 'fixed', noCenter ? '' : 'top-[50%] left-[50%]', !draggable &&
                    !noCenter &&
                    '-translate-x-1/2 -translate-y-1/2 data-open:zoom-in-95 data-closed:zoom-out-95', className), ...props, style: draggable
                    ? { transform: noCenter ? undefined : effectiveBaseTransform, ...props.style }
                    : props.style, onPointerDown: draggable ? handlePointerDown : props.onPointerDown, children: [children, showCloseButton && (_jsxs(DialogPrimitive.Close, { "data-slot": "dialog-close", render: _jsx(Button, { variant: "ghost", className: "absolute top-2 right-2", size: "icon-sm" }), children: [_jsx(XIcon, {}), _jsx("span", { className: "sr-only", children: t('flux.dialog.close') })] }))] })] }));
});
DialogContent.displayName = 'DialogContent';
function DialogHeader({ className, ...props }) {
    const { draggable } = React.useContext(DialogContext);
    return (_jsx("div", { "data-slot": "dialog-header", className: cn('flex flex-col gap-2 p-4 pb-0', draggable && 'cursor-grab select-none', className), ...props }));
}
function DialogBody({ className, ...props }) {
    return (_jsx("div", { "data-slot": "dialog-body", className: cn('flex flex-col gap-4 p-4', className), ...props }));
}
function DialogFooter({ className, showCloseButton = false, children, ...props }) {
    return (_jsxs("div", { "data-slot": "dialog-footer", className: cn('mt-auto flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 pt-0 sm:flex-row sm:justify-end', className), ...props, children: [children, showCloseButton && (_jsx(DialogPrimitive.Close, { render: _jsx(Button, { variant: "outline" }), children: t('flux.common.close') }))] }));
}
function DialogTitle({ className, ...props }) {
    return (_jsx(DialogPrimitive.Title, { "data-slot": "dialog-title", className: cn('font-heading text-base leading-none font-medium', className), ...props }));
}
function DialogDescription({ className, ...props }) {
    return (_jsx(DialogPrimitive.Description, { "data-slot": "dialog-description", className: cn('text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground', className), ...props }));
}
export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, };
