"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
const Progress = React.forwardRef(function Progress({ className, value, ...props }, ref) {
    return (_jsx(ProgressPrimitive.Root, { ref: ref, "data-slot": "progress", className: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className), ...props, children: _jsx(ProgressPrimitive.Indicator, { "data-slot": "progress-indicator", className: "h-full w-full flex-1 bg-primary transition-all", style: { transform: `translateX(-${100 - (value || 0)}%)` } }) }));
});
Progress.displayName = 'Progress';
export { Progress };
