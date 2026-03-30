export function getDefaultSelectionTarget(document) {
    const firstSheet = document.spreadsheet.workbook.sheets[0];
    if (!firstSheet) {
        return { kind: 'workbook' };
    }
    return { kind: 'sheet', sheetId: firstSheet.id };
}
export function createDefaultSemantic() {
    return {
        workbookMeta: {},
        sheetMeta: {},
        cellMeta: {},
        rangeMeta: {},
    };
}
export function createReportTemplateDocument(spreadsheet, name) {
    return {
        id: crypto.randomUUID(),
        kind: 'report-template',
        name: name ?? 'Untitled Report',
        version: '1.0.0',
        spreadsheet,
        semantic: createDefaultSemantic(),
    };
}
export function getCellMeta(semantic, sheetId, address) {
    return semantic?.cellMeta?.[sheetId]?.[address];
}
export function setCellMeta(semantic, sheetId, address, meta) {
    const sheetEntries = { ...(semantic.cellMeta ?? {}) };
    const cellEntries = { ...(sheetEntries[sheetId] ?? {}) };
    cellEntries[address] = meta;
    sheetEntries[sheetId] = cellEntries;
    return { ...semantic, cellMeta: sheetEntries };
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceVal = source[key];
        const targetVal = result[key];
        if (sourceVal !== null &&
            typeof sourceVal === 'object' &&
            !Array.isArray(sourceVal) &&
            targetVal !== null &&
            typeof targetVal === 'object' &&
            !Array.isArray(targetVal)) {
            result[key] = deepMerge(targetVal, sourceVal);
        }
        else {
            result[key] = sourceVal;
        }
    }
    return result;
}
export function updateCellMeta(semantic, sheetId, address, patch) {
    const existing = getCellMeta(semantic, sheetId, address) ?? {};
    const merged = deepMerge(existing, patch);
    return setCellMeta(semantic, sheetId, address, merged);
}
export function getRowMeta(semantic, sheetId, row) {
    return semantic?.rowMeta?.[sheetId]?.[String(row)];
}
export function setRowMeta(semantic, sheetId, row, meta) {
    const sheetEntries = { ...(semantic.rowMeta ?? {}) };
    const rowEntries = { ...(sheetEntries[sheetId] ?? {}) };
    rowEntries[String(row)] = meta;
    sheetEntries[sheetId] = rowEntries;
    return { ...semantic, rowMeta: sheetEntries };
}
export function updateRowMeta(semantic, sheetId, row, patch) {
    const existing = getRowMeta(semantic, sheetId, row) ?? {};
    const merged = { ...existing, ...patch };
    return setRowMeta(semantic, sheetId, row, merged);
}
export function getColumnMeta(semantic, sheetId, col) {
    return semantic?.columnMeta?.[sheetId]?.[String(col)];
}
export function setColumnMeta(semantic, sheetId, col, meta) {
    const sheetEntries = { ...(semantic.columnMeta ?? {}) };
    const colEntries = { ...(sheetEntries[sheetId] ?? {}) };
    colEntries[String(col)] = meta;
    sheetEntries[sheetId] = colEntries;
    return { ...semantic, columnMeta: sheetEntries };
}
export function updateColumnMeta(semantic, sheetId, col, patch) {
    const existing = getColumnMeta(semantic, sheetId, col) ?? {};
    const merged = { ...existing, ...patch };
    return setColumnMeta(semantic, sheetId, col, merged);
}
export function getSheetMeta(semantic, sheetId) {
    return semantic?.sheetMeta?.[sheetId];
}
export function setSheetMeta(semantic, sheetId, meta) {
    const sheetEntries = { ...(semantic.sheetMeta ?? {}) };
    sheetEntries[sheetId] = meta;
    return { ...semantic, sheetMeta: sheetEntries };
}
export function updateSheetMeta(semantic, sheetId, patch) {
    const existing = getSheetMeta(semantic, sheetId) ?? {};
    const merged = { ...existing, ...patch };
    return setSheetMeta(semantic, sheetId, merged);
}
export function setRangeMeta(semantic, sheetId, rangeMeta) {
    const rangeEntries = { ...(semantic.rangeMeta ?? {}) };
    const sheetRanges = [...(rangeEntries[sheetId] ?? [])];
    const idx = sheetRanges.findIndex((r) => r.id === rangeMeta.id);
    if (idx >= 0) {
        sheetRanges[idx] = rangeMeta;
    }
    else {
        sheetRanges.push(rangeMeta);
    }
    rangeEntries[sheetId] = sheetRanges;
    return { ...semantic, rangeMeta: rangeEntries };
}
export function getTargetMeta(semantic, target) {
    switch (target.kind) {
        case 'workbook':
            return semantic?.workbookMeta;
        case 'sheet':
            return getSheetMeta(semantic, target.sheetId);
        case 'row':
            return getRowMeta(semantic, target.sheetId, target.row);
        case 'column':
            return getColumnMeta(semantic, target.sheetId, target.col);
        case 'cell':
            return getCellMeta(semantic, target.cell.sheetId, target.cell.address);
        case 'range': {
            const rangeEntries = semantic?.rangeMeta?.[target.range.sheetId];
            if (rangeEntries && rangeEntries.length > 0) {
                return rangeEntries[0].meta;
            }
            return undefined;
        }
        default:
            return undefined;
    }
}
export function isSameTarget(a, b) {
    if (a.kind !== b.kind)
        return false;
    switch (a.kind) {
        case 'workbook':
            return b.kind === 'workbook';
        case 'sheet':
            return b.kind === 'sheet' && a.sheetId === b.sheetId;
        case 'row':
            return b.kind === 'row' && a.sheetId === b.sheetId && a.row === b.row;
        case 'column':
            return b.kind === 'column' && a.sheetId === b.sheetId && a.col === b.col;
        case 'cell':
            return (b.kind === 'cell' &&
                a.cell.sheetId === b.cell.sheetId &&
                a.cell.row === b.cell.row &&
                a.cell.col === b.cell.col);
        case 'range':
            return (b.kind === 'range' &&
                a.range.sheetId === b.range.sheetId &&
                a.range.startRow === b.range.startRow &&
                a.range.startCol === b.range.startCol &&
                a.range.endRow === b.range.endRow &&
                a.range.endCol === b.range.endCol);
    }
}
