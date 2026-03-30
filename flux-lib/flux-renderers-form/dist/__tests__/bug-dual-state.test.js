import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
const submitCalls = [];
const env = {
    fetcher: async function (_api, ctx) {
        submitCalls.push(ctx.scope.readOwn());
        return {
            ok: true,
            status: 200,
            data: ctx.scope.readOwn()
        };
    },
    notify: () => undefined
};
let capturedForm;
function FormHandleProbe() {
    const form = useCurrentForm();
    capturedForm = form;
    return null;
}
const formHandleProbeRenderer = {
    type: 'form-handle-probe',
    component: FormHandleProbe
};
const buttonRenderer = {
    type: 'button',
    component: (props) => (_jsx("button", { type: "button", onClick: () => void props.events.onClick?.(), children: String(props.props.label ?? props.meta.label ?? 'Button') })),
    fields: [{ key: 'onClick', kind: 'event' }]
};
function PlainScopeArrayHost() {
    const SchemaRenderer = React.useMemo(() => createSchemaRenderer(formRendererDefinitions), []);
    const [data, setData] = React.useState({ items: [{ id: 'item-0', value: 'alice' }] });
    return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setData({ items: [{ id: 'item-0', value: 'carol' }] }), children: "Reset plain array" }), _jsx(SchemaRenderer, { schema: {
                    type: 'array-editor',
                    name: 'items',
                    label: 'Items'
                }, data: data, env: env, formulaCompiler: createFormulaCompiler() })] }));
}
function PlainScopeKeyValueHost() {
    const SchemaRenderer = React.useMemo(() => createSchemaRenderer(formRendererDefinitions), []);
    const [data, setData] = React.useState({ metadata: [{ id: 'pair-0', key: 'env', value: 'prod' }] });
    return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setData({ metadata: [{ id: 'pair-0', key: 'region', value: 'us-east' }] }), children: "Reset plain metadata" }), _jsx(SchemaRenderer, { schema: {
                    type: 'key-value',
                    name: 'metadata',
                    label: 'Metadata'
                }, data: data, env: env, formulaCompiler: createFormulaCompiler() })] }));
}
describe('bug: dual state in array-editor and key-value renderers', () => {
    beforeEach(() => {
        submitCalls.length = 0;
        capturedForm = undefined;
        cleanup();
    });
    it('array-editor UI should reflect values after form.reset()', async () => {
        const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer, formHandleProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'form',
                data: {
                    items: [{ value: 'alice' }]
                },
                body: [
                    {
                        type: 'array-editor',
                        name: 'items',
                        label: 'Items'
                    },
                    {
                        type: 'form-handle-probe',
                        name: '_probe'
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        const input = screen.getByPlaceholderText('Item 1');
        expect(input.value).toBe('alice');
        fireEvent.change(input, { target: { value: 'bob' } });
        expect(input.value).toBe('bob');
        expect(capturedForm).toBeDefined();
        capturedForm.reset({ items: [{ id: 'item-0', value: 'alice' }] });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Item 1').value).toBe('alice');
        });
    });
    it('array-editor UI should reflect values after form.setValue()', async () => {
        const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer, formHandleProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'form',
                data: {
                    items: [{ value: 'alice' }]
                },
                body: [
                    {
                        type: 'array-editor',
                        name: 'items',
                        label: 'Items'
                    },
                    {
                        type: 'form-handle-probe',
                        name: '_probe'
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        const input = screen.getByPlaceholderText('Item 1');
        expect(input.value).toBe('alice');
        fireEvent.change(input, { target: { value: 'bob' } });
        expect(input.value).toBe('bob');
        expect(capturedForm).toBeDefined();
        capturedForm.setValue('items', [{ id: 'item-0', value: 'carol' }]);
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Item 1').value).toBe('carol');
        });
    });
    it('key-value UI should reflect values after form.reset()', async () => {
        const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer, formHandleProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'form',
                data: {
                    metadata: [{ key: 'env', value: 'prod' }]
                },
                body: [
                    {
                        type: 'key-value',
                        name: 'metadata',
                        label: 'Metadata'
                    },
                    {
                        type: 'form-handle-probe',
                        name: '_probe'
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        const keyInput = screen.getByPlaceholderText('Key');
        const valueInput = screen.getByPlaceholderText('Value');
        expect(keyInput.value).toBe('env');
        expect(valueInput.value).toBe('prod');
        fireEvent.change(keyInput, { target: { value: 'tier' } });
        fireEvent.change(valueInput, { target: { value: 'gold' } });
        expect(keyInput.value).toBe('tier');
        expect(valueInput.value).toBe('gold');
        expect(capturedForm).toBeDefined();
        capturedForm.reset({ metadata: [{ id: 'pair-0', key: 'env', value: 'prod' }] });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Key').value).toBe('env');
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Value').value).toBe('prod');
        });
    });
    it('key-value UI should reflect values after form.setValue()', async () => {
        const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer, formHandleProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'form',
                data: {
                    metadata: [{ key: 'env', value: 'prod' }]
                },
                body: [
                    {
                        type: 'key-value',
                        name: 'metadata',
                        label: 'Metadata'
                    },
                    {
                        type: 'form-handle-probe',
                        name: '_probe'
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        const keyInput = screen.getByPlaceholderText('Key');
        const valueInput = screen.getByPlaceholderText('Value');
        expect(keyInput.value).toBe('env');
        expect(valueInput.value).toBe('prod');
        fireEvent.change(keyInput, { target: { value: 'tier' } });
        fireEvent.change(valueInput, { target: { value: 'gold' } });
        expect(keyInput.value).toBe('tier');
        expect(valueInput.value).toBe('gold');
        expect(capturedForm).toBeDefined();
        capturedForm.setValue('metadata', [{ id: 'pair-0', key: 'region', value: 'us-east' }]);
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Key').value).toBe('region');
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Value').value).toBe('us-east');
        });
    });
    it('array-editor UI should reflect values after plain scope data updates', async () => {
        render(_jsx(PlainScopeArrayHost, {}));
        const input = screen.getByPlaceholderText('Item 1');
        expect(input.value).toBe('alice');
        fireEvent.change(input, { target: { value: 'bob' } });
        expect(input.value).toBe('bob');
        fireEvent.click(screen.getByText('Reset plain array'));
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Item 1').value).toBe('carol');
        });
    });
    it('key-value UI should reflect values after plain scope data updates', async () => {
        render(_jsx(PlainScopeKeyValueHost, {}));
        const keyInput = screen.getByPlaceholderText('Key');
        const valueInput = screen.getByPlaceholderText('Value');
        expect(keyInput.value).toBe('env');
        expect(valueInput.value).toBe('prod');
        fireEvent.change(keyInput, { target: { value: 'tier' } });
        fireEvent.change(valueInput, { target: { value: 'gold' } });
        expect(keyInput.value).toBe('tier');
        expect(valueInput.value).toBe('gold');
        fireEvent.click(screen.getByText('Reset plain metadata'));
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Key').value).toBe('region');
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Value').value).toBe('us-east');
        });
    });
});
