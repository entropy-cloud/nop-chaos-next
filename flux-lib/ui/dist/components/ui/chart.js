'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../lib/utils.js';
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' };
const INITIAL_DIMENSION = { width: 320, height: 200 };
const SAFE_CSS_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const SAFE_CHART_ID = /^[A-Za-z0-9_-]+$/;
const SAFE_COLOR_VALUE = /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\([^;{}<>]*\)|var\(--[A-Za-z0-9_-]+\)|[A-Za-z]+)$/;
function sanitizeChartId(value) {
    return SAFE_CHART_ID.test(value) ? value : value.replace(/[^A-Za-z0-9_-]/g, '');
}
function sanitizeConfigKey(value) {
    return SAFE_CSS_IDENTIFIER.test(value) ? value : null;
}
function sanitizeColorValue(value) {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return SAFE_COLOR_VALUE.test(trimmed) ? trimmed : null;
}
const ChartContext = React.createContext(null);
function useChart() {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />');
    }
    return context;
}
function ChartContainer({ id, className, children, config, initialDimension = INITIAL_DIMENSION, ...props }) {
    const uniqueId = React.useId();
    const chartId = sanitizeChartId(`chart-${id ?? uniqueId.replace(/:/g, '')}`);
    const contextValue = React.useMemo(() => ({ config }), [config]);
    return (_jsx(ChartContext.Provider, { value: contextValue, children: _jsxs("div", { "data-slot": "chart", "data-chart": chartId, className: cn("flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden", className), ...props, children: [_jsx(ChartStyle, { id: chartId, config: config }), _jsx(RechartsPrimitive.ResponsiveContainer, { initialDimension: initialDimension, children: children })] }) }));
}
const ChartStyle = ({ id, config }) => {
    const colorConfig = Object.entries(config)
        .map(([key, itemConfig]) => ({ key: sanitizeConfigKey(key), itemConfig }))
        .filter((entry) => Boolean(entry.key) && Boolean(entry.itemConfig.theme ?? entry.itemConfig.color));
    if (!colorConfig.length) {
        return null;
    }
    return (_jsx("style", { dangerouslySetInnerHTML: {
            __html: Object.entries(THEMES)
                .map(([theme, prefix]) => `
${prefix} [data-chart="${sanitizeChartId(id)}"] {
${colorConfig
                .map(({ key, itemConfig }) => {
                const color = sanitizeColorValue(itemConfig.theme?.[theme] ?? itemConfig.color);
                return color ? `  --color-${key}: ${color};` : null;
            })
                .filter((entry) => Boolean(entry))
                .join('\n')}
}
`)
                .join('\n'),
        } }));
};
const ChartTooltip = RechartsPrimitive.Tooltip;
function ChartTooltipContent({ active, payload, className, indicator = 'dot', hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey, }) {
    const { config } = useChart();
    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload?.length) {
            return null;
        }
        const [item] = payload;
        const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const value = !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : itemConfig?.label;
        if (labelFormatter) {
            return (_jsx("div", { className: cn('font-medium', labelClassName), children: labelFormatter(value, payload) }));
        }
        if (!value) {
            return null;
        }
        return _jsx("div", { className: cn('font-medium', labelClassName), children: value });
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);
    if (!active || !payload?.length) {
        return null;
    }
    const nestLabel = payload.length === 1 && indicator !== 'dot';
    return (_jsxs("div", { className: cn('grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl', className), children: [!nestLabel ? tooltipLabel : null, _jsx("div", { className: "grid gap-1.5", children: payload
                    .filter((item) => item.type !== 'none')
                    .map((item, index) => {
                    const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);
                    const indicatorColor = color ?? item.payload?.fill ?? item.color;
                    return (_jsx("div", { className: cn('flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground', indicator === 'dot' && 'items-center'), children: formatter && item?.value !== undefined && item.name ? (formatter(item.value, item.name, item, index, item.payload)) : (_jsxs(_Fragment, { children: [itemConfig?.icon ? (_jsx(itemConfig.icon, {})) : (!hideIndicator && (_jsx("div", { className: cn('shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)', {
                                        'h-2.5 w-2.5': indicator === 'dot',
                                        'w-1': indicator === 'line',
                                        'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                                        'my-0.5': nestLabel && indicator === 'dashed',
                                    }), style: {
                                        '--color-bg': indicatorColor,
                                        '--color-border': indicatorColor,
                                    } }))), _jsxs("div", { className: cn('flex flex-1 justify-between leading-none', nestLabel ? 'items-end' : 'items-center'), children: [_jsxs("div", { className: "grid gap-1.5", children: [nestLabel ? tooltipLabel : null, _jsx("span", { className: "text-muted-foreground", children: itemConfig?.label ?? item.name })] }), item.value != null && (_jsx("span", { className: "font-mono font-medium text-foreground tabular-nums", children: typeof item.value === 'number'
                                                ? item.value.toLocaleString()
                                                : String(item.value) }))] })] })) }, key));
                }) })] }));
}
const ChartLegend = RechartsPrimitive.Legend;
function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey, }) {
    const { config } = useChart();
    if (!payload?.length) {
        return null;
    }
    return (_jsx("div", { className: cn('flex items-center justify-center gap-4', verticalAlign === 'top' ? 'pb-3' : 'pt-3', className), children: payload
            .filter((item) => item.type !== 'none')
            .map((item) => {
            const key = `${nameKey ?? item.dataKey ?? 'value'}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            return (_jsxs("div", { className: cn('flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'), children: [itemConfig?.icon && !hideIcon ? (_jsx(itemConfig.icon, {})) : (_jsx("div", { className: "h-2 w-2 shrink-0 rounded-[2px]", style: {
                            backgroundColor: item.color,
                        } })), itemConfig?.label] }, item.value));
        }) }));
}
function getPayloadConfigFromPayload(config, payload, key) {
    if (typeof payload !== 'object' || payload === null) {
        return undefined;
    }
    const payloadPayload = 'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
        ? payload.payload
        : undefined;
    let configLabelKey = key;
    if (key in payload && typeof payload[key] === 'string') {
        configLabelKey = payload[key];
    }
    else if (payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key] === 'string') {
        configLabelKey = payloadPayload[key];
    }
    return configLabelKey in config ? config[configLabelKey] : config[key];
}
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, };
