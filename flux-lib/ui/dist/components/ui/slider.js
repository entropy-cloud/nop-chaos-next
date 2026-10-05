'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '../../lib/utils.js';
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }) {
    const _values = Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
            ? defaultValue
            : [min, max];
    return (_jsx(SliderPrimitive.Root
    // [G6-R5-视角6-01] explicit bidirectional orientation rules throughout
    // (Base UI emits data-orientation, not bare data-horizontal/vertical).
    , { 
        // [G6-R5-视角6-01] explicit bidirectional orientation rules throughout
        // (Base UI emits data-orientation, not bare data-horizontal/vertical).
        className: cn('nop-slider ', 'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full', className), "data-slot": "slider", defaultValue: defaultValue, value: value, min: min, max: max, thumbAlignment: "edge", ...props, children: _jsxs(SliderPrimitive.Control, { className: "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", children: [_jsx(SliderPrimitive.Track, { "data-slot": "slider-track", className: "relative grow overflow-hidden rounded-full bg-muted select-none data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1", children: _jsx(SliderPrimitive.Indicator, { "data-slot": "slider-range", className: "bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" }) }), Array.from({ length: _values.length }, (_, index) => (_jsx(SliderPrimitive.Thumb, { "data-slot": "slider-thumb", className: "relative block size-3 shrink-0 rounded-full border border-ring bg-background ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50" }, `thumb-${index}`)))] }) }));
}
export { Slider };
