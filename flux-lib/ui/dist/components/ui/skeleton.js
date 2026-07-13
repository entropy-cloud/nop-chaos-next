import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils.js';
function Skeleton({ className, ...props }) {
    return (_jsx("div", { "data-slot": "skeleton", className: cn('nop-skeleton ', 'animate-pulse rounded-md bg-muted', className), ...props }));
}
export { Skeleton };
