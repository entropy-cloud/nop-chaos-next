import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '../../lib/utils.js';
import { ChevronRightIcon, CheckIcon } from 'lucide-react';
function DropdownMenu({ ...props }) {
    return _jsx(MenuPrimitive.Root, { "data-slot": "dropdown-menu", ...props });
}
function DropdownMenuPortal({ ...props }) {
    return _jsx(MenuPrimitive.Portal, { "data-slot": "dropdown-menu-portal", ...props });
}
function DropdownMenuTrigger({ ...props }) {
    return _jsx(MenuPrimitive.Trigger, { "data-slot": "dropdown-menu-trigger", ...props });
}
function DropdownMenuPositioner({ className, ...props }) {
    return (_jsx(MenuPrimitive.Positioner, { "data-slot": "dropdown-menu-positioner", className: cn('isolate z-50 outline-none', className), ...props }));
}
function DropdownMenuPopup({ className, ...props }) {
    return (_jsx(MenuPrimitive.Popup, { "data-slot": "dropdown-menu-popup", className: cn('z-50 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none', className), ...props }));
}
function DropdownMenuContent({ align = 'start', alignOffset = 0, side = 'bottom', sideOffset = 4, className, ...props }) {
    return (_jsx(MenuPrimitive.Portal, { children: _jsx(MenuPrimitive.Positioner, { className: "isolate z-50 outline-none", align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, children: _jsx(MenuPrimitive.Popup, { "data-slot": "dropdown-menu-content", className: cn('z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95', className), ...props }) }) }));
}
function DropdownMenuGroup({ ...props }) {
    return _jsx(MenuPrimitive.Group, { "data-slot": "dropdown-menu-group", ...props });
}
function DropdownMenuLabel({ className, inset, ...props }) {
    return (_jsx(MenuPrimitive.GroupLabel, { "data-slot": "dropdown-menu-label", "data-inset": inset, className: cn('px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7', className), ...props }));
}
function DropdownMenuItem({ className, inset, variant = 'default', ...props }) {
    return (_jsx(MenuPrimitive.Item, { "data-slot": "dropdown-menu-item", "data-inset": inset, "data-variant": variant, className: cn("group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive", className), ...props }));
}
function DropdownMenuSub({ ...props }) {
    return _jsx(MenuPrimitive.SubmenuRoot, { "data-slot": "dropdown-menu-sub", ...props });
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
    return (_jsxs(MenuPrimitive.SubmenuTrigger, { "data-slot": "dropdown-menu-sub-trigger", "data-inset": inset, className: cn("flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [children, _jsx(ChevronRightIcon, { className: "ml-auto" })] }));
}
function DropdownMenuSubContent({ align = 'start', alignOffset = -3, side = 'right', sideOffset = 0, className, ...props }) {
    return (_jsx(DropdownMenuContent, { "data-slot": "dropdown-menu-sub-content", className: cn('w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95', className), align: align, alignOffset: alignOffset, side: side, sideOffset: sideOffset, ...props }));
}
function DropdownMenuCheckboxItem({ className, children, checked, inset, ...props }) {
    return (_jsxs(MenuPrimitive.CheckboxItem, { "data-slot": "dropdown-menu-checkbox-item", "data-inset": inset, className: cn("relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), checked: checked, ...props, children: [_jsx("span", { className: "pointer-events-none absolute right-2 flex items-center justify-center", "data-slot": "dropdown-menu-checkbox-item-indicator", children: _jsx(MenuPrimitive.CheckboxItemIndicator, { children: _jsx(CheckIcon, {}) }) }), children] }));
}
function DropdownMenuRadioGroup({ ...props }) {
    return _jsx(MenuPrimitive.RadioGroup, { "data-slot": "dropdown-menu-radio-group", ...props });
}
function DropdownMenuRadioItem({ className, children, inset, ...props }) {
    return (_jsxs(MenuPrimitive.RadioItem, { "data-slot": "dropdown-menu-radio-item", "data-inset": inset, className: cn("relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [_jsx("span", { className: "pointer-events-none absolute right-2 flex items-center justify-center", "data-slot": "dropdown-menu-radio-item-indicator", children: _jsx(MenuPrimitive.RadioItemIndicator, { children: _jsx(CheckIcon, {}) }) }), children] }));
}
function DropdownMenuSeparator({ className, ...props }) {
    return (_jsx(MenuPrimitive.Separator, { "data-slot": "dropdown-menu-separator", className: cn('-mx-1 my-1 h-px bg-border', className), ...props }));
}
function DropdownMenuShortcut({ className, ...props }) {
    return (_jsx("span", { "data-slot": "dropdown-menu-shortcut", className: cn('ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground', className), ...props }));
}
export { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuPositioner, DropdownMenuPopup, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, };
