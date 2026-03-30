export function createEmptyAdapterRegistry() {
    return {
        fieldSources: new Map(),
        inspectors: new Map(),
        fieldDrops: new Map(),
        previews: new Map(),
        codecs: new Map(),
        expressions: new Map(),
        references: new Map(),
        inspectorValues: new Map(),
    };
}
export function createStaticFieldSourceProvider(id, fieldSources) {
    return {
        id,
        load() {
            return fieldSources.map((source) => ({
                ...source,
                groups: source.groups.map((group) => ({
                    ...group,
                    fields: group.fields.map((field) => ({ ...field })),
                })),
            }));
        },
    };
}
export function createStaticInspectorProvider(id, targetKind, panels) {
    return {
        id,
        match(target) {
            return target.kind === targetKind;
        },
        getPanels() {
            return panels.map((panel) => ({ ...panel }));
        },
    };
}
export function createMetaPatchDropAdapter(input) {
    return {
        id: input.id,
        canHandle(field) {
            return !input.fieldType || field.type === input.fieldType;
        },
        mapDropToMetaPatch(args) {
            return input.createPatch(args.field);
        },
    };
}
export function createUnsupportedTemplateCodecAdapter(id) {
    return {
        id,
        importDocument() {
            throw new Error(`Template codec ${id} does not support import`);
        },
        exportDocument() {
            throw new Error(`Template codec ${id} does not support export`);
        },
    };
}
