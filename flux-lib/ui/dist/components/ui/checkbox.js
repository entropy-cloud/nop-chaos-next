"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
const Checkbox = React.forwardRef(function Checkbox({ className, ...props }, ref) {
    return (_jsx(CheckboxPrimitive.Root, { ref: ref, "data-slot": "checkbox", className: cn("peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary", className), ...props, children: _jsx(CheckboxPrimitive.Indicator, { "data-slot": "checkbox-indicator", className: "grid place-content-center text-current transition-none", children: _jsx(CheckIcon, { className: "size-3.5" }) }) }));
});
Checkbox.displayName = 'Checkbox';
export { Checkbox };
