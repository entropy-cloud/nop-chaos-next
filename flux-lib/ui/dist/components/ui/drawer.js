'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { XIcon } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { t } from '../../lib/i18n.js';
import { useGlobalZIndex } from '../../hooks/use-global-z-index.js';
import { wrapSurfaceTabFocus } from './wrap-surface-tab-focus.js';
function toSwipeDirection(direction) {
    if (direction === 'top') {
        return 'up';
    }
    if (direction === 'bottom') {
        return 'down';
    }
    return direction;
}
const DrawerContext = React.createContext({
    direction: 'bottom',
    containerElement: null,
});
const DrawerZIndexContext = React.createContext(undefined);
const DRAWER_SIDE_SIZE_CAPS = {
    xs: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-xs)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-xs)]',
    sm: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-sm)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-sm)]',
    base: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-base)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-base)]',
    md: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-md)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-md)]',
    lg: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-lg)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-lg)]',
    xl: 'data-[swipe-direction=left]:sm:max-w-[var(--overlay-size-xl)] data-[swipe-direction=right]:sm:max-w-[var(--overlay-size-xl)]',
};
function Drawer({ direction = 'bottom', containerElement, handleOnly: _handleOnly, onOpenChange, ...props }) {
    const contextValue = React.useMemo(() => ({ direction, containerElement: containerElement ?? null }), [containerElement, direction]);
    return (_jsx(DrawerContext.Provider, { value: contextValue, children: _jsx(DrawerPrimitive.Root, { "data-slot": "drawer", swipeDirection: toSwipeDirection(direction), onOpenChange: onOpenChange
                ? (open, eventDetails) => onOpenChange(open, eventDetails)
                : undefined, ...props }) }));
}
function DrawerTrigger({ ...props }) {
    return _jsx(DrawerPrimitive.Trigger, { "data-slot": "drawer-trigger", ...props });
}
function DrawerPortal({ container, ...props }) {
    const { containerElement } = React.useContext(DrawerContext);
    return (_jsx(DrawerPrimitive.Portal, { "data-slot": "drawer-portal", container: container ?? containerElement ?? undefined, ...props }));
}
function DrawerClose({ ...props }) {
    return _jsx(DrawerPrimitive.Close, { "data-slot": "drawer-close", ...props });
}
function DrawerOverlay({ className, ...props }) {
    const { containerElement } = React.useContext(DrawerContext);
    const zIndex = React.useContext(DrawerZIndexContext);
    const isContained = containerElement != null;
    return (_jsx(DrawerPrimitive.Backdrop, { "data-slot": "drawer-overlay", className: cn('bg-surface-overlay supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0', isContained ? 'absolute inset-0' : 'fixed inset-0', className), style: zIndex === undefined ? undefined : { zIndex }, ...props }));
}
function DrawerContent({ className, children, showMask = true, showCloseButton = true, resizable = false, size = 'sm', style, ...props }) {
    const { direction, containerElement } = React.useContext(DrawerContext);
    const isContained = containerElement != null;
    const resizeController = useDrawerResize(direction, resizable);
    const zIndex = useGlobalZIndex();
    const handleClassName = cn(
    // [G6-视角3-03] keyboard-reachable separator: visible focus state rides on
    // the same handle element that carries the pointer + arrow-key resize.
    'pointer-events-auto absolute z-20 flex items-center justify-center bg-transparent transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-1 focus-visible:outline-ring', direction === 'left' && 'right-0 top-0 h-full w-1 cursor-ew-resize', direction === 'right' && 'left-0 top-0 h-full w-1 cursor-ew-resize', direction === 'top' && 'bottom-0 left-0 w-full h-1 cursor-ns-resize', direction === 'bottom' && 'top-0 left-0 w-full h-1 cursor-ns-resize');
    // R3-U25: Base UI resolves function-style className/style against component
    // state on Content — forward those forms verbatim instead of dropping them.
    const resolvedClassName = typeof className === 'function'
        ? className
        : cn('group/drawer-content flex h-full flex-col', className);
    // [G6-R3-视角6-01] the resize handle wrote `--drawer-resize-size` onto Content
    // while the width/height classes live on Popup — the variable had zero
    // consumers, so dragging changed nothing. Consume it directly on the Popup
    // geometry (inline width/height + the CSS var as a stable consumer marker).
    const isHorizontalResize = direction === 'left' || direction === 'right';
    const popupResizeStyle = resizeController.sizeVar
        ? {
            ['--drawer-resize-size']: resizeController.sizeVar,
            ...(isHorizontalResize
                ? { width: resizeController.sizeVar, maxWidth: resizeController.sizeVar }
                : { height: resizeController.sizeVar, maxHeight: resizeController.sizeVar }),
        }
        : undefined;
    const layers = (_jsxs(DrawerZIndexContext.Provider, { value: zIndex, children: [showMask && _jsx(DrawerOverlay, {}), _jsx(DrawerPrimitive.Viewport, { className: cn('inset-0 pointer-events-none', isContained ? 'absolute' : 'fixed'), style: { zIndex }, children: _jsx(DrawerPrimitive.Popup, { "data-slot": "drawer-popup", "data-size": size, onKeyDown: (event) => {
                        wrapSurfaceTabFocus(event);
                    }, className: cn('pointer-events-auto flex h-auto flex-col bg-popover text-sm text-popover-foreground outline-none', isContained ? 'absolute' : 'fixed', 'data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:mt-24 data-[swipe-direction=down]:max-h-[80vh] data-[swipe-direction=down]:rounded-t-xl data-[swipe-direction=down]:border-t data-[swipe-direction=down]:translate-y-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))] data-[swipe-direction=down]:data-starting-style:translate-y-full data-[swipe-direction=down]:data-ending-style:translate-y-full', 'data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:mb-24 data-[swipe-direction=up]:max-h-[80vh] data-[swipe-direction=up]:rounded-b-xl data-[swipe-direction=up]:border-b data-[swipe-direction=up]:-translate-y-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))] data-[swipe-direction=up]:data-starting-style:-translate-y-full data-[swipe-direction=up]:data-ending-style:-translate-y-full', 'data-[swipe-direction=left]:inset-x-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:w-3/4 data-[swipe-direction=left]:rounded-r-xl data-[swipe-direction=left]:border-r data-[swipe-direction=left]:-translate-x-[var(--drawer-swipe-movement-x,0px)] data-[swipe-direction=left]:data-starting-style:-translate-x-full data-[swipe-direction=left]:data-ending-style:-translate-x-full', 'data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:w-3/4 data-[swipe-direction=right]:rounded-l-xl data-[swipe-direction=right]:border-l data-[swipe-direction=right]:translate-x-[var(--drawer-swipe-movement-x,0px)] data-[swipe-direction=right]:data-starting-style:translate-x-full data-[swipe-direction=right]:data-ending-style:translate-x-full', DRAWER_SIDE_SIZE_CAPS[size], 'duration-300 data-open:animate-in data-closed:animate-out'), style: { ['--drawer-direction']: direction, ...popupResizeStyle }, children: _jsxs(DrawerPrimitive.Content, { "data-slot": "drawer-content", "data-direction": direction, "data-resizable": resizable ? 'true' : undefined, className: resolvedClassName, style: style, ...props, children: [_jsx("div", { className: "mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[direction=bottom]/drawer-content:block" }), resizable && (_jsx("div", { "data-slot": "drawer-resize-handle", "data-direction": direction, className: handleClassName, onPointerDown: resizeController.onPointerDown, onKeyDown: resizeController.onKeyDown, role: "separator", tabIndex: 0, "aria-orientation": direction === 'left' || direction === 'right' ? 'vertical' : 'horizontal', "aria-label": t('flux.drawer.resize') })), children, showCloseButton && (_jsxs(DrawerPrimitive.Close, { "data-slot": "drawer-close", render: _jsx(Button, { variant: "ghost", size: "icon-sm", className: "absolute top-2 right-2 z-30" }), children: [_jsx(XIcon, {}), _jsx("span", { className: "sr-only", children: t('flux.drawer.close') })] }))] }) }) })] }));
    return (_jsx(DrawerPortal, { children: isContained ? (_jsx("div", { "data-slot": "drawer-contained-root", className: "relative block size-full", children: layers })) : (layers) }));
}
const DRAWER_RESIZE_GROW_KEY = {
    left: 'ArrowRight',
    right: 'ArrowLeft',
    top: 'ArrowDown',
    bottom: 'ArrowUp',
};
const DRAWER_RESIZE_SHRINK_KEY = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    top: 'ArrowUp',
    bottom: 'ArrowDown',
};
function clampDrawerResizeSize(size, viewportMax) {
    return Math.min(Math.max(160, size), viewportMax);
}
function useDrawerResize(direction, enabled) {
    const [size, setSize] = React.useState(null);
    const dragStateRef = React.useRef(null);
    // 06-01: the active drag's teardown, so an unmount mid-drag can detach the
    // window listeners (same leak guard as use-dialog-drag's cleanup effect).
    const teardownRef = React.useRef(null);
    React.useEffect(() => {
        return () => {
            teardownRef.current?.();
        };
    }, []);
    const onPointerDown = React.useCallback((event) => {
        if (!enabled) {
            return;
        }
        const popup = event.currentTarget.closest('[data-slot="drawer-popup"]');
        if (!popup) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const rect = popup.getBoundingClientRect();
        const startSize = direction === 'left' || direction === 'right' ? rect.width : rect.height;
        dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startSize,
            target: popup,
        };
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        catch {
            // ignore — pointer capture is best-effort
        }
        const releaseCapture = (pointerEvent) => {
            try {
                const target = pointerEvent.target;
                target?.releasePointerCapture?.(pointerEvent.pointerId);
            }
            catch {
                // ignore
            }
        };
        // 06-01: single teardown shared by pointerup / pointercancel /
        // lostpointercapture (use-dialog-drag hygiene) — a cancelled drag must
        // not leave a ghost-resize window where stray pointermove events keep
        // driving the size.
        const teardown = () => {
            dragStateRef.current = null;
            teardownRef.current = null;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleEnd);
            window.removeEventListener('pointercancel', handleEnd);
            window.removeEventListener('lostpointercapture', handleEnd);
        };
        const handleMove = (moveEvent) => {
            const state = dragStateRef.current;
            if (!state || !state.target) {
                return;
            }
            // Button-press validation (use-dialog-drag hygiene): a pointermove
            // with no pressed button means the press was lost — stop resizing
            // instead of ghost-following the pointer.
            if (moveEvent.buttons === 0) {
                releaseCapture(moveEvent);
                teardown();
                return;
            }
            const delta = direction === 'left'
                ? moveEvent.clientX - state.startX
                : direction === 'right'
                    ? state.startX - moveEvent.clientX
                    : direction === 'top'
                        ? moveEvent.clientY - state.startY
                        : state.startY - moveEvent.clientY;
            // Min/Max clamp (G6-R3-视角6-01): keep the drawer usable on both ends —
            // never smaller than 160px, never larger than 90% of the viewport axis.
            const viewportMax = (direction === 'left' || direction === 'right' ? window.innerWidth : window.innerHeight) *
                0.9;
            const next = Math.min(Math.max(160, state.startSize + delta), viewportMax);
            setSize(next);
        };
        const handleEnd = (pointerEvent) => {
            releaseCapture(pointerEvent);
            teardown();
        };
        teardownRef.current = teardown;
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleEnd);
        window.addEventListener('pointercancel', handleEnd);
        window.addEventListener('lostpointercapture', handleEnd);
    }, [direction, enabled]);
    const sizeVar = React.useMemo(() => {
        if (size === null) {
            return null;
        }
        return `${size}px`;
    }, [size]);
    // [G6-视角3-03] the resize handle previously answered pointers only; a
    // keyboard user could focus nothing and resize never. Arrow keys grow/shrink
    // along the same clamped path as the pointer drag (Shift = larger step).
    const onKeyDown = React.useCallback((event) => {
        if (!enabled) {
            return;
        }
        if (event.key !== DRAWER_RESIZE_GROW_KEY[direction] && event.key !== DRAWER_RESIZE_SHRINK_KEY[direction]) {
            return;
        }
        const popup = event.currentTarget.closest('[data-slot="drawer-popup"]');
        if (!popup) {
            return;
        }
        event.preventDefault();
        const rect = popup.getBoundingClientRect();
        const horizontal = direction === 'left' || direction === 'right';
        const current = horizontal ? rect.width : rect.height;
        const step = event.shiftKey ? 48 : 16;
        const delta = event.key === DRAWER_RESIZE_GROW_KEY[direction] ? step : -step;
        const viewportMax = (horizontal ? window.innerWidth : window.innerHeight) * 0.9;
        setSize(clampDrawerResizeSize(current + delta, viewportMax));
    }, [direction, enabled]);
    return { sizeVar, onPointerDown, onKeyDown };
}
function DrawerHeader({ className, ...props }) {
    const { direction } = React.useContext(DrawerContext);
    return (_jsx("div", { "data-slot": "drawer-header", "data-direction": direction, className: cn('flex flex-col gap-0.5 py-4 pb-0 px-[var(--overlay-anatomy-body-padding-x)] md:gap-0.5 md:text-left', 'data-[direction=bottom]:text-center data-[direction=top]:text-center', className), ...props }));
}
function DrawerFooter({ className, ...props }) {
    return (_jsx("div", { "data-slot": "drawer-footer", className: cn('mt-auto flex flex-col gap-[var(--overlay-anatomy-footer-gap)] py-4 pt-0 px-[var(--overlay-anatomy-body-padding-x)]', className), ...props }));
}
function DrawerBody({ className, ...props }) {
    // [G6-R2-视角6-01] body scroll contract — same shape as DialogBody: flex-1 +
    // min-h-0 + overflow-y-auto so long content scrolls inside the drawer instead
    // of overflowing past max-h-[80vh]/h-full.
    return (_jsx("div", { "data-slot": "drawer-body", className: cn('flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto py-4 px-[var(--overlay-anatomy-body-padding-x)]', className), ...props }));
}
function DrawerTitle({ className, ...props }) {
    return (_jsx(DrawerPrimitive.Title, { "data-slot": "drawer-title", className: cn('font-heading text-[length:var(--overlay-anatomy-title-font-size)] font-medium text-foreground', className), ...props }));
}
function DrawerDescription({ className, ...props }) {
    return (_jsx(DrawerPrimitive.Description, { "data-slot": "drawer-description", className: cn('text-sm text-muted-foreground', className), ...props }));
}
export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle, DrawerDescription, };
