import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils.js';
import { Loader2Icon } from 'lucide-react';
function Spinner({ className, ...props }) {
    return (_jsx(Loader2Icon, { role: "status", "aria-label": "Loading", className: cn('size-4 animate-spin', className), ...props }));
}
export { Spinner };
