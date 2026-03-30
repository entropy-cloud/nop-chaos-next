import { jsx as _jsx } from "react/jsx-runtime";
import { Circle, icons } from 'lucide-react';
const ICON_ALIAS_MAP = {
    house: 'home',
    language: 'languages',
    'puzzle-piece': 'puzzle',
    gear: 'settings-2',
    cog: 'settings-2'
};
function toIconLookupKey(value) {
    return value
        .trim()
        .replace(/^fa[srlbdt]?\s+/i, '')
        .replace(/^fa-(solid|regular|light|thin|duotone|brands)\s+/i, '')
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .toLowerCase();
}
function normalizeIconName(value) {
    if (!value) {
        return undefined;
    }
    const normalized = toIconLookupKey(value);
    return ICON_ALIAS_MAP[normalized] ?? normalized;
}
function toLucideKey(iconName) {
    return iconName
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}
function resolveIcon(iconName) {
    const normalizedIconName = normalizeIconName(iconName);
    if (!normalizedIconName) {
        return Circle;
    }
    const key = toLucideKey(normalizedIconName);
    return icons[key] ?? Circle;
}
export function DesignerIcon(props) {
    const Icon = resolveIcon(props.icon);
    const IconComp = Icon;
    return (_jsx(IconComp, { className: props.className, "data-icon": props.icon, size: props.size ?? 16, strokeWidth: 1.8, "aria-hidden": "true", focusable: "false" }));
}
