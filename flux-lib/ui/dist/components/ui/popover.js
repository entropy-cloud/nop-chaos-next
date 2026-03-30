import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
function Popover({ ...props }) {
    return _jsx(PopoverPrimitive.Root, { "data-slot": "popover", ...props });
}
const PopoverTrigger = React.forwardRef(function PopoverTrigger(props, ref) {
    return _jsx(PopoverPrimitive.Trigger, { ref: ref, "data-slot": "popover-trigger", ...props });
});
PopoverTrigger.displayName = 'PopoverTrigger';
const PopoverContent = React.forwardRef(function PopoverContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
    return (_jsx(PopoverPrimitive.Portal, { children: _jsx(PopoverPrimitive.Content, { ref: ref, "data-slot": "popover-content", align: align, sideOffset: sideOffset, className: cn("z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className), ...props }) }));
});
PopoverContent.displayName = 'PopoverContent';
const PopoverAnchor = React.forwardRef(function PopoverAnchor(props, ref) {
    return _jsx(PopoverPrimitive.Anchor, { ref: ref, "data-slot": "popover-anchor", ...props });
});
PopoverAnchor.displayName = 'PopoverAnchor';
function PopoverHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "popover-header", className: cn("flex flex-col gap-1 text-sm", className), ...props }));
}
function PopoverTitle({ className, ...props }) {
    return (_jsx("div", { "data-slot": "popover-title", className: cn("font-medium", className), ...props }));
}
function PopoverDescription({ className, ...props }) {
    return (_jsx("p", { "data-slot": "popover-description", className: cn("text-muted-foreground", className), ...props }));
}
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription, };
