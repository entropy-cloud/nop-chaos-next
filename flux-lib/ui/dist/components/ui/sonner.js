import { jsx as _jsx } from "react/jsx-runtime";
import { Toaster as Sonner } from 'sonner';
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon, } from 'lucide-react';
import { cn } from '../../lib/utils.js';
const TOASTER_Z_INDEX = 10000;
const defaultIcons = {
    success: _jsx(CircleCheckIcon, { className: "size-4" }),
    info: _jsx(InfoIcon, { className: "size-4" }),
    warning: _jsx(TriangleAlertIcon, { className: "size-4" }),
    error: _jsx(OctagonXIcon, { className: "size-4" }),
    loading: _jsx(Loader2Icon, { className: "size-4 animate-spin" }),
};
const defaultToastOptions = {
    classNames: {
        toast: 'cn-toast',
    },
};
const Toaster = ({ ...props }) => {
    return (_jsx(Sonner, { ...props, theme: props.theme ?? 'light', className: cn('nop-toaster toaster group', props.className), icons: props.icons ?? defaultIcons, style: {
            '--normal-bg': 'hsl(var(--popover, var(--card)))',
            '--normal-text': 'hsl(var(--popover-foreground, var(--card-foreground)))',
            '--normal-border': 'hsl(var(--border))',
            '--border-radius': 'var(--radius)',
            zIndex: TOASTER_Z_INDEX,
            ...props.style,
        }, toastOptions: props.toastOptions ?? defaultToastOptions }));
};
export { Toaster, TOASTER_Z_INDEX };
