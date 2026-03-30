import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { cn } from '../../lib/utils';
const ScrollArea = React.forwardRef(function ScrollArea({ className, children, ...props }, ref) {
    return (_jsxs(ScrollAreaPrimitive.Root, { ref: ref, "data-slot": "scroll-area", className: cn("relative", className), ...props, children: [_jsx(ScrollAreaPrimitive.Viewport, { "data-slot": "scroll-area-viewport", className: "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1", children: children }), _jsx(ScrollBar, {}), _jsx(ScrollAreaPrimitive.Corner, {})] }));
});
ScrollArea.displayName = 'ScrollArea';
const ScrollBar = React.forwardRef(function ScrollBar({ className, orientation = "vertical", ...props }, ref) {
    return (_jsx(ScrollAreaPrimitive.ScrollAreaScrollbar, { ref: ref, "data-slot": "scroll-area-scrollbar", orientation: orientation, className: cn("flex touch-none p-px transition-colors select-none", orientation === "vertical" &&
            "h-full w-2.5 border-l border-l-transparent", orientation === "horizontal" &&
            "h-2.5 flex-col border-t border-t-transparent", className), ...props, children: _jsx(ScrollAreaPrimitive.ScrollAreaThumb, { "data-slot": "scroll-area-thumb", className: "relative flex-1 rounded-full bg-border" }) }));
});
ScrollBar.displayName = 'ScrollBar';
export { ScrollArea, ScrollBar };
