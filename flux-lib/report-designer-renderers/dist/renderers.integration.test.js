import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, useRenderScope } from '@nop-chaos/flux-react';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from './index.js';
const env = {
    fetcher: async () => ({ ok: true, status: 200, data: null }),
    notify: () => undefined,
};
const actionButtonRenderer = {
    type: 'action-button',
    component: (props) => (_jsx("button", { type: "button", onClick: () => void props.events.onClick?.(), children: String(props.props.label ?? props.meta.label ?? 'Action') })),
    fields: [{ key: 'onClick', kind: 'event' }],
};
afterEach(() => {
    cleanup();
});
const textRenderer = {
    type: 'text',
    component: (props) => _jsx("span", { children: String(props.props.text ?? '') }),
};
function WorkbookTitleProbe() {
    const scope = useRenderScope();
    const scopeData = scope.readOwn();
    const title = scopeData.reportDocument?.semantic?.workbookMeta?.title;
    return _jsx("span", { "data-testid": "sheet-title", children: title ?? '' });
}
const sheetTitleProbeRenderer = {
    type: 'sheet-title-probe',
    component: WorkbookTitleProbe,
};
function createRuntimeConfig(overrides) {
    return {
        kind: 'report-template',
        ...(overrides ?? {}),
    };
}
function renderReportDesignerPage(input) {
    const spreadsheet = createEmptyDocument('integration-report-designer');
    const document = createReportTemplateDocument(spreadsheet, 'Integration Report');
    const schema = defineReportDesignerPageSchema({
        type: 'report-designer-page',
        document,
        designer: input.config ?? createRuntimeConfig(),
        toolbar: input.toolbar,
        inspector: input.inspector,
    });
    const registry = createDefaultRegistry([actionButtonRenderer, textRenderer, sheetTitleProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();
    render(_jsx(SchemaRenderer, { schema: schema, env: env, registry: registry, formulaCompiler: createFormulaCompiler(), data: {} }));
}
describe('report-designer namespaced actions integration', () => {
    it('updates sheet metadata from toolbar action via report-designer namespace', async () => {
        renderReportDesignerPage({
            toolbar: [
                {
                    type: 'action-button',
                    label: 'Set Sheet Title',
                    onClick: {
                        action: 'report-designer:updateMeta',
                        args: {
                            target: {
                                kind: 'workbook',
                            },
                            patch: {
                                title: 'Toolbar Updated',
                            },
                        },
                    },
                },
                {
                    type: 'sheet-title-probe',
                },
            ],
        });
        fireEvent.click(screen.getByRole('button', { name: 'Set Sheet Title' }));
        await waitFor(() => {
            expect(screen.getByTestId('sheet-title').textContent).toBe('Toolbar Updated');
        });
    });
    it('submits inspector panel action through report-designer namespace', async () => {
        renderReportDesignerPage({
            config: createRuntimeConfig({
                inspector: {
                    providers: [
                        {
                            id: 'sheet-basic',
                            label: 'Sheet Basic',
                            match: { kinds: ['sheet'] },
                            mode: 'tab',
                            body: {
                                type: 'text',
                                text: 'Sheet inspector panel',
                            },
                            submitAction: {
                                action: 'report-designer:updateMeta',
                                args: {
                                    target: {
                                        kind: 'workbook',
                                    },
                                    patch: {
                                        title: 'Inspector Updated',
                                    },
                                },
                            },
                        },
                    ],
                },
            }),
            toolbar: {
                type: 'sheet-title-probe',
            },
            inspector: {
                type: 'report-inspector-shell',
            },
        });
        await waitFor(() => {
            expect(screen.getByText('Save Panel')).toBeTruthy();
        });
        fireEvent.click(screen.getByText('Save Panel'));
        await waitFor(() => {
            expect(screen.getByTestId('sheet-title').textContent).toBe('Inspector Updated');
        });
    });
});
