import { jsx as _jsx } from "react/jsx-runtime";
import { Toaster as Sonner } from 'sonner';
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon, } from 'lucide-react';
const Toaster = ({ ...props }) => {
    return (_jsx(Sonner, { theme: props.theme ?? 'light', className: "toaster group", icons: {
            success: _jsx(CircleCheckIcon, { className: "size-4" }),
            info: _jsx(InfoIcon, { className: "size-4" }),
            warning: _jsx(TriangleAlertIcon, { className: "size-4" }),
            error: _jsx(OctagonXIcon, { className: "size-4" }),
            loading: _jsx(Loader2Icon, { className: "size-4 animate-spin" }),
        }, style: {
            '--normal-bg': 'hsl(var(--popover, var(--card)))',
            '--normal-text': 'hsl(var(--popover-foreground, var(--card-foreground)))',
            '--normal-border': 'hsl(var(--border))',
            '--border-radius': 'var(--radius)',
        }, toastOptions: {
            classNames: {
                toast: 'cn-toast',
            },
        }, ...props }));
};
export { Toaster };
