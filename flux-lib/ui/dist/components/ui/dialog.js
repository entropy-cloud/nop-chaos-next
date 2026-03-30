import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
import { Button } from './button';
import { useDialogDrag } from './use-dialog-drag';
const DialogContext = React.createContext({ draggable: false, noOverlay: false, noCenter: false, closeOnOutsideClick: true });
function Dialog({ draggable = true, noOverlay = false, noCenter = false, closeOnOutsideClick = true, ...props }) {
    return (_jsx(DialogContext.Provider, { value: { draggable, noOverlay, noCenter, closeOnOutsideClick }, children: _jsx(DialogPrimitive.Root, { "data-slot": "dialog", ...props }) }));
}
const DialogTrigger = React.forwardRef(function DialogTrigger(props, ref) {
    return _jsx(DialogPrimitive.Trigger, { ref: ref, "data-slot": "dialog-trigger", ...props });
});
DialogTrigger.displayName = 'DialogTrigger';
function DialogPortal({ ...props }) {
    return _jsx(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props });
}
const DialogClose = React.forwardRef(function DialogClose(props, ref) {
    return _jsx(DialogPrimitive.Close, { ref: ref, "data-slot": "dialog-close", ...props });
});
DialogClose.displayName = 'DialogClose';
const DialogOverlay = React.forwardRef(function DialogOverlay({ className, ...props }, ref) {
    return (_jsx(DialogPrimitive.Overlay, { ref: ref, "data-slot": "dialog-overlay", className: cn("fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0", className), ...props }));
});
DialogOverlay.displayName = 'DialogOverlay';
const DialogContent = React.forwardRef(function DialogContent({ className, children, showCloseButton = true, offsetRef, baseTransform, ...props }, ref) {
    const { draggable, noOverlay, noCenter, closeOnOutsideClick } = React.useContext(DialogContext);
    const { contentRef, handlePointerDown } = useDialogDrag({ enabled: draggable, offsetRef, baseTransform: noCenter ? '' : baseTransform }, ref);
    return (_jsxs(DialogPortal, { "data-slot": "dialog-portal", children: [!noOverlay && _jsx(DialogOverlay, {}), _jsxs(DialogPrimitive.Content, { ref: contentRef, "data-slot": "dialog-content", className: cn("fixed z-50 w-full max-w-[calc(100%-2rem)] rounded-xl border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0 sm:max-w-lg", noCenter ? "flex flex-col" : "grid gap-4 top-[50%] left-[50%]", !draggable && !noCenter && "translate-x-[-50%] translate-y-[-50%] data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95", className), ...props, style: draggable
                    ? { transform: noCenter ? undefined : (baseTransform ?? 'translate(-50%, -50%)'), ...props.style }
                    : props.style, onPointerDown: draggable ? handlePointerDown : props.onPointerDown, onPointerDownOutside: !closeOnOutsideClick ? (e) => e.preventDefault() : props.onPointerDownOutside, onInteractOutside: !closeOnOutsideClick ? (e) => e.preventDefault() : props.onInteractOutside, children: [children, showCloseButton && (_jsxs(DialogPrimitive.Close, { "data-slot": "dialog-close", className: "absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-[background-color,color,opacity,box-shadow] duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", children: [_jsx(XIcon, {}), _jsx("span", { className: "sr-only", children: "Close" })] }))] })] }));
});
DialogContent.displayName = 'DialogContent';
function DialogHeader({ className, ...props }) {
    const { draggable } = React.useContext(DialogContext);
    return (_jsx("div", { "data-slot": "dialog-header", className: cn("flex flex-col gap-2 text-center sm:text-left", draggable && "cursor-grab select-none", className), ...props }));
}
function DialogFooter({ className, showCloseButton = false, children, ...props }) {
    return (_jsxs("div", { "data-slot": "dialog-footer", className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className), ...props, children: [children, showCloseButton && (_jsx(DialogPrimitive.Close, { asChild: true, children: _jsx(Button, { variant: "outline", children: "Close" }) }))] }));
}
const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
    return (_jsx(DialogPrimitive.Title, { ref: ref, "data-slot": "dialog-title", className: cn("text-lg leading-none font-semibold", className), ...props }));
});
DialogTitle.displayName = 'DialogTitle';
const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
    return (_jsx(DialogPrimitive.Description, { ref: ref, "data-slot": "dialog-description", className: cn("text-sm text-muted-foreground", className), ...props }));
});
DialogDescription.displayName = 'DialogDescription';
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, };
