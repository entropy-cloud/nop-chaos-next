import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
export function TableRenderer(props) {
    const columns = Array.isArray(props.props.columns) ? props.props.columns : [];
    const source = Array.isArray(props.props.source) ? props.props.source : [];
    const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
    const headerContent = resolveRendererSlotContent(props, 'header');
    const footerContent = resolveRendererSlotContent(props, 'footer');
    const columnCount = Math.max(columns.length, 1);
    return (_jsxs("div", { className: "nop-table-wrap grid gap-4", "data-testid": props.meta.testid || undefined, children: [hasRendererSlotContent(headerContent) ? _jsx("div", { className: "nop-table__header", children: headerContent }) : null, _jsxs(Table, { className: "nop-table", children: [_jsx(TableHeader, { className: "nop-table__header", children: _jsx(TableRow, { children: columns.map((column, index) => {
                                const labelRegion = typeof column.labelRegionKey === 'string' ? props.regions[column.labelRegionKey] : undefined;
                                const labelContent = labelRegion?.render({ pathSuffix: `columns.${index}.label` }) ?? column.label ?? column.name;
                                return _jsx(TableHead, { children: labelContent }, `${column.name ?? column.label ?? 'column'}-${index}`);
                            }) }) }), _jsx(TableBody, { children: source.length === 0
                            ? (_jsx(TableRow, { className: "nop-table__empty-row", children: _jsx(TableCell, { colSpan: columnCount, className: "nop-table__empty-cell", children: emptyContent }) }))
                            : source.map((record, index) => {
                                const rowScope = props.helpers.createScope({ record, index }, {
                                    scopeKey: `row:${record.id ?? index}`,
                                    pathSuffix: `rows.${index}`,
                                    source: 'row'
                                });
                                return (_jsx(TableRow, { className: props.events.onRowClick ? 'nop-table__row nop-table__row--interactive' : 'nop-table__row', onClick: props.events.onRowClick ? (event) => void props.events.onRowClick?.(event, { scope: rowScope }) : undefined, children: columns.map((column, columnIndex) => {
                                        const cellRegion = typeof column.cellRegionKey === 'string' ? props.regions[column.cellRegionKey] : undefined;
                                        const buttonRegion = typeof column.buttonsRegionKey === 'string' ? props.regions[column.buttonsRegionKey] : undefined;
                                        if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
                                            return (_jsx(TableCell, { children: _jsx("div", { className: "nop-table__actions flex flex-wrap gap-3", onClick: (event) => event.stopPropagation(), children: buttonRegion
                                                        ? buttonRegion.render({
                                                            scope: rowScope,
                                                            pathSuffix: `buttons.${columnIndex}`
                                                        })
                                                        : (column.buttons ?? []).map((button, buttonIndex) => (_jsx("div", { children: props.helpers.render(button, {
                                                                scope: rowScope,
                                                                pathSuffix: `buttons.${buttonIndex}`
                                                            }) }, `btn-${buttonIndex}`))) }) }, `op-${columnIndex}`));
                                        }
                                        if (cellRegion) {
                                            return (_jsx(TableCell, { children: cellRegion.render({
                                                    scope: rowScope,
                                                    pathSuffix: `cells.${columnIndex}`
                                                }) }, `${column.name ?? columnIndex}`));
                                        }
                                        return _jsx(TableCell, { children: column.name ? String(record[column.name] ?? '') : '' }, `${column.name ?? columnIndex}`);
                                    }) }, String(record.id ?? index)));
                            }) })] }), hasRendererSlotContent(footerContent) ? _jsx("div", { className: "nop-table__footer", children: footerContent }) : null] }));
}
