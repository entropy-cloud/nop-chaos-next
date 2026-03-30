export function isReportDesignerCommand(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const cmd = value;
    return typeof cmd.type === 'string' && cmd.type.startsWith('report-designer:');
}
