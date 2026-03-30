"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
function DropdownMenu({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Root, { "data-slot": "dropdown-menu", ...props });
}
function DropdownMenuPortal({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.Portal, { "data-slot": "dropdown-menu-portal", ...props }));
}
const DropdownMenuTrigger = React.forwardRef(function DropdownMenuTrigger(props, ref) {
    return (_jsx(DropdownMenuPrimitive.Trigger, { ref: ref, "data-slot": "dropdown-menu-trigger", ...props }));
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';
const DropdownMenuContent = React.forwardRef(function DropdownMenuContent({ className, sideOffset = 4, ...props }, ref) {
    return (_jsx(DropdownMenuPrimitive.Portal, { children: _jsx(DropdownMenuPrimitive.Content, { ref: ref, "data-slot": "dropdown-menu-content", sideOffset: sideOffset, className: cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className), ...props }) }));
});
DropdownMenuContent.displayName = 'DropdownMenuContent';
function DropdownMenuGroup({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.Group, { "data-slot": "dropdown-menu-group", ...props }));
}
const DropdownMenuItem = React.forwardRef(function DropdownMenuItem({ className, inset, variant = "default", ...props }, ref) {
    return (_jsx(DropdownMenuPrimitive.Item, { ref: ref, "data-slot": "dropdown-menu-item", "data-inset": inset, "data-variant": variant, className: cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!", className), ...props }));
});
DropdownMenuItem.displayName = 'DropdownMenuItem';
const DropdownMenuCheckboxItem = React.forwardRef(function DropdownMenuCheckboxItem({ className, children, checked, ...props }, ref) {
    return (_jsxs(DropdownMenuPrimitive.CheckboxItem, { ref: ref, "data-slot": "dropdown-menu-checkbox-item", className: cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), checked: checked, ...props, children: [_jsx("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: _jsx(DropdownMenuPrimitive.ItemIndicator, { children: _jsx(CheckIcon, { className: "size-4" }) }) }), children] }));
});
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';
function DropdownMenuRadioGroup({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.RadioGroup, { "data-slot": "dropdown-menu-radio-group", ...props }));
}
const DropdownMenuRadioItem = React.forwardRef(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
    return (_jsxs(DropdownMenuPrimitive.RadioItem, { ref: ref, "data-slot": "dropdown-menu-radio-item", className: cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [_jsx("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: _jsx(DropdownMenuPrimitive.ItemIndicator, { children: _jsx(CircleIcon, { className: "size-2 fill-current" }) }) }), children] }));
});
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';
function DropdownMenuLabel({ className, inset, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Label, { "data-slot": "dropdown-menu-label", "data-inset": inset, className: cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className), ...props }));
}
function DropdownMenuSeparator({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Separator, { "data-slot": "dropdown-menu-separator", className: cn("-mx-1 my-1 h-px bg-border", className), ...props }));
}
function DropdownMenuShortcut({ className, ...props }) {
    return (_jsx("span", { "data-slot": "dropdown-menu-shortcut", className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className), ...props }));
}
function DropdownMenuSub({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Sub, { "data-slot": "dropdown-menu-sub", ...props });
}
const DropdownMenuSubTrigger = React.forwardRef(function DropdownMenuSubTrigger({ className, inset, children, ...props }, ref) {
    return (_jsxs(DropdownMenuPrimitive.SubTrigger, { ref: ref, "data-slot": "dropdown-menu-sub-trigger", "data-inset": inset, className: cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", className), ...props, children: [children, _jsx(ChevronRightIcon, { className: "ml-auto size-4" })] }));
});
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';
const DropdownMenuSubContent = React.forwardRef(function DropdownMenuSubContent({ className, ...props }, ref) {
    return (_jsx(DropdownMenuPrimitive.SubContent, { ref: ref, "data-slot": "dropdown-menu-sub-content", className: cn("z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className), ...props }));
});
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';
export { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, };
