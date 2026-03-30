"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
function Sheet({ ...props }) {
    return _jsx(SheetPrimitive.Root, { "data-slot": "sheet", ...props });
}
const SheetTrigger = React.forwardRef(function SheetTrigger(props, ref) {
    return _jsx(SheetPrimitive.Trigger, { ref: ref, "data-slot": "sheet-trigger", ...props });
});
SheetTrigger.displayName = 'SheetTrigger';
const SheetClose = React.forwardRef(function SheetClose(props, ref) {
    return _jsx(SheetPrimitive.Close, { ref: ref, "data-slot": "sheet-close", ...props });
});
SheetClose.displayName = 'SheetClose';
function SheetPortal({ ...props }) {
    return _jsx(SheetPrimitive.Portal, { "data-slot": "sheet-portal", ...props });
}
const SheetOverlay = React.forwardRef(function SheetOverlay({ className, ...props }, ref) {
    return (_jsx(SheetPrimitive.Overlay, { ref: ref, "data-slot": "sheet-overlay", className: cn("fixed inset-0 z-50 bg-black/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:fade-in-0", className), ...props }));
});
SheetOverlay.displayName = 'SheetOverlay';
const SheetContent = React.forwardRef(function SheetContent({ className, children, side = "right", showCloseButton = true, ...props }, ref) {
    return (_jsxs(SheetPortal, { children: [_jsx(SheetOverlay, {}), _jsxs(SheetPrimitive.Content, { ref: ref, "data-slot": "sheet-content", className: cn("fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-200", side === "right" &&
                    "inset-y-0 right-0 h-full w-3/4 border-l rounded-l-xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm", side === "left" &&
                    "inset-y-0 left-0 h-full w-3/4 border-r rounded-r-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm", side === "top" &&
                    "inset-x-0 top-0 h-auto border-b rounded-b-xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top", side === "bottom" &&
                    "inset-x-0 bottom-0 h-auto border-t rounded-t-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", className), ...props, children: [children, showCloseButton && (_jsxs(SheetPrimitive.Close, { className: "absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-[background-color,color,opacity,box-shadow] duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary", children: [_jsx(XIcon, { className: "size-4" }), _jsx("span", { className: "sr-only", children: "Close" })] }))] })] }));
});
SheetContent.displayName = 'SheetContent';
function SheetHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "sheet-header", className: cn("flex flex-col gap-1.5 p-4", className), ...props }));
}
function SheetFooter({ className, ...props }) {
    return (_jsx("div", { "data-slot": "sheet-footer", className: cn("mt-auto flex flex-col gap-2 p-4", className), ...props }));
}
const SheetTitle = React.forwardRef(function SheetTitle({ className, ...props }, ref) {
    return (_jsx(SheetPrimitive.Title, { ref: ref, "data-slot": "sheet-title", className: cn("font-semibold text-foreground", className), ...props }));
});
SheetTitle.displayName = 'SheetTitle';
const SheetDescription = React.forwardRef(function SheetDescription({ className, ...props }, ref) {
    return (_jsx(SheetPrimitive.Description, { ref: ref, "data-slot": "sheet-description", className: cn("text-sm text-muted-foreground", className), ...props }));
});
SheetDescription.displayName = 'SheetDescription';
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, };
