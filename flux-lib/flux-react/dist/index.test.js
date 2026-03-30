import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/flux-runtime';
import { createSchemaRenderer, hasRendererSlotContent, resolveRendererSlotContent, useAggregateError, useCurrentActionScope, useCurrentComponentRegistry, useChildFieldState, useCurrentForm, useCurrentFormError, useCurrentFormErrors, useFieldError, useOwnedFieldState, useRenderScope, useScopeSelector, useValidationNodeState } from './index';
const env = {
    fetcher: async function () {
        return { ok: true, status: 200, data: null };
    },
    notify: () => undefined
};
const sharedFormulaCompiler = createFormulaCompiler();
const textRenderer = {
    type: 'text',
    component: (props) => _jsx("span", { children: String(props.props.text ?? '') })
};
const pageRenderer = {
    type: 'page',
    component: (props) => _jsx("section", { children: props.regions.body?.render() }),
    regions: ['body']
};
const formRenderer = {
    type: 'form',
    component: (props) => _jsx("section", { children: props.regions.body?.render() }),
    regions: ['body'],
    scopePolicy: 'form',
    componentRegistryPolicy: 'new',
    validation: {
        kind: 'container'
    }
};
function ProbeInput() {
    const scope = useRenderScope();
    const form = useCurrentForm();
    useOwnedFieldState('email');
    const value = String(scope.get('email') ?? '');
    return (_jsxs("label", { children: [_jsx("span", { children: "Email" }), _jsx("input", { "aria-label": "Email", value: value, onChange: (event) => form?.setValue('email', event.target.value) })] }));
}
const probeInputRenderer = {
    type: 'probe-input',
    component: ProbeInput
};
function ProbeButton() {
    const scope = useRenderScope();
    const form = useCurrentForm();
    const value = String(scope.get('query') ?? '');
    return (_jsx("div", { children: _jsx("input", { "aria-label": "Query", value: value, onChange: (event) => {
                if (form) {
                    form.touchField('query');
                    form.setValue('query', event.target.value);
                }
            } }) }));
}
const probeButtonRenderer = {
    type: 'probe-button',
    component: (props) => (_jsx("button", { disabled: props.meta.disabled, "aria-label": "Search", children: "Search" }))
};
const probeQueryInputRenderer = {
    type: 'probe-query-input',
    component: ProbeButton
};
function PageValueProbe() {
    const scope = useRenderScope();
    return _jsx("span", { "data-testid": "page-value", children: String(scope.get('currentUser.name') ?? '') });
}
const pageValueProbeRenderer = {
    type: 'page-value-probe',
    component: PageValueProbe
};
const probeFormSchema = {
    type: 'form',
    data: {
        email: ''
    },
    body: [
        {
            type: 'probe-input'
        }
    ]
};
const pageWithProbeFormSchema = {
    type: 'page',
    body: [
        {
            type: 'page-value-probe'
        },
        probeFormSchema
    ]
};
const fragmentScopedProbeFormSchema = {
    type: 'form',
    data: {
        email: ''
    },
    body: [
        {
            type: 'probe-input'
        }
    ]
};
function SelectorText() {
    const value = useScopeSelector((scope) => scope.message ?? '');
    return _jsx("span", { children: String(value) });
}
function ActionScopeProbe() {
    const actionScope = useCurrentActionScope();
    const componentRegistry = useCurrentComponentRegistry();
    return (_jsxs("div", { children: [_jsx("span", { "data-testid": "action-scope-id", children: actionScope?.id ?? '' }), _jsx("span", { "data-testid": "component-registry-id", children: componentRegistry?.id ?? '' })] }));
}
const selectorRenderer = {
    type: 'selector-text',
    component: SelectorText
};
const actionScopeProbeRenderer = {
    type: 'action-scope-probe',
    component: ActionScopeProbe
};
function CompositeErrorProbe() {
    const form = useCurrentForm();
    const ownedRootState = useOwnedFieldState('metadata');
    const childState = useChildFieldState('metadata.0.value');
    const nodeState = useValidationNodeState('metadata');
    const rootError = useCurrentFormError({
        path: 'metadata',
        ownerPath: 'metadata',
        sourceKinds: ['runtime-registration']
    });
    const childError = useCurrentFormError({
        path: 'metadata.0.value',
        ownerPath: 'metadata',
        sourceKinds: ['runtime-registration']
    });
    const ownedErrors = useCurrentFormErrors({
        ownerPath: 'metadata',
        sourceKinds: ['runtime-registration']
    });
    const aggregateError = useAggregateError('metadata');
    const fieldError = useFieldError('metadata.0.value');
    React.useEffect(() => {
        if (!form) {
            return;
        }
        return form.registerField({
            path: 'metadata',
            childPaths: ['metadata.0.value'],
            getValue() {
                return [];
            },
            validate() {
                return [{ path: 'metadata', rule: 'required', message: 'Metadata requires at least one entry' }];
            },
            validateChild(path) {
                return [{ path, rule: 'required', message: 'Entry 1 value is required' }];
            }
        });
    }, [form]);
    return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => void form?.validateField('metadata'), children: "Validate root" }), _jsx("button", { type: "button", onClick: () => void form?.validateField('metadata.0.value'), children: "Validate child" }), _jsx("span", { "data-testid": "root-error", children: rootError?.message ?? '' }), _jsx("span", { "data-testid": "child-error", children: childError?.message ?? '' }), _jsx("span", { "data-testid": "owned-count", children: String(ownedErrors.length) }), _jsx("span", { "data-testid": "owned-root-error", children: ownedRootState.error?.message ?? '' }), _jsx("span", { "data-testid": "child-state-error", children: childState.error?.message ?? '' }), _jsx("span", { "data-testid": "node-state-error", children: nodeState.error?.message ?? '' }), _jsx("span", { "data-testid": "aggregate-error", children: aggregateError?.message ?? '' }), _jsx("span", { "data-testid": "field-error", children: fieldError?.message ?? '' })] }));
}
const compositeProbeRenderer = {
    type: 'composite-probe',
    component: CompositeErrorProbe
};
const buttonRenderer = {
    type: 'button',
    component: (props) => (_jsx("button", { type: "button", onClick: () => void props.events.onClick?.(), children: String(props.props.label ?? props.meta.label ?? 'Button') })),
    fields: [{ key: 'onClick', kind: 'event' }]
};
function FragmentRenderHost(props) {
    const [tick, setTick] = React.useState(0);
    return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setTick((current) => current + 1), children: ["Refresh fragment ", tick] }), props.helpers.render(fragmentScopedProbeFormSchema, {
                data: {
                    currentUser: {
                        role: 'architect'
                    }
                },
                pathSuffix: 'fragment'
            })] }));
}
const fragmentRenderHostRenderer = {
    type: 'fragment-render-host',
    component: FragmentRenderHost
};
const scopedHostRenderer = {
    type: 'scoped-host',
    component: (props) => _jsx("section", { children: props.regions.body?.render() }),
    regions: ['body'],
    actionScopePolicy: 'new',
    componentRegistryPolicy: 'new'
};
function NamespaceProvider(props) {
    const actionScope = useCurrentActionScope();
    const namespace = String(props.props.namespace ?? 'demo');
    const label = String(props.props.label ?? props.meta.label ?? 'provider');
    React.useEffect(() => {
        if (!actionScope) {
            return;
        }
        return actionScope.registerNamespace(namespace, {
            kind: 'host',
            invoke(method, payload) {
                return {
                    ok: true,
                    data: `${label}:${method}:${String(payload?.value ?? '')}`
                };
            }
        });
    }, [actionScope, namespace, label]);
    return _jsx("span", { "data-testid": `namespace-scope-${label}`, children: actionScope?.id ?? '' });
}
const namespaceProviderRenderer = {
    type: 'namespace-provider',
    component: NamespaceProvider
};
function ComponentHandleProvider(props) {
    const componentRegistry = useCurrentComponentRegistry();
    const componentName = String(props.props.componentName ?? 'shared');
    const label = String(props.props.label ?? props.meta.label ?? 'handle');
    React.useEffect(() => {
        if (!componentRegistry) {
            return;
        }
        return componentRegistry.register({
            name: componentName,
            type: 'probe',
            capabilities: {
                hasMethod(method) {
                    return method === 'ping';
                },
                invoke(method, payload) {
                    return {
                        ok: true,
                        data: `${label}:${method}:${String(payload?.value ?? '')}`
                    };
                }
            }
        });
    }, [componentRegistry, componentName, label]);
    return _jsx("span", { "data-testid": `component-registry-scope-${label}`, children: componentRegistry?.id ?? '' });
}
const componentHandleProviderRenderer = {
    type: 'component-handle-provider',
    component: ComponentHandleProvider
};
function DispatchProbe(props) {
    const [resultText, setResultText] = React.useState('');
    return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: async () => {
                    const result = await props.helpers.dispatch(props.props.runAction);
                    setResultText(result.ok ? String(result.data ?? '') : String(result.error ?? ''));
                }, children: String(props.props.label ?? props.meta.label ?? 'Run dispatch') }), _jsx("span", { "data-testid": String(props.props.resultKey ?? 'dispatch-result'), children: resultText })] }));
}
const dispatchProbeRenderer = {
    type: 'dispatch-probe',
    component: DispatchProbe
};
function ToggleHost(props) {
    const [visible, setVisible] = React.useState(true);
    return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setVisible((current) => !current), children: visible ? 'Hide child boundary' : 'Show child boundary' }), visible ? props.regions.body?.render() : null] }));
}
const toggleHostRenderer = {
    type: 'toggle-host',
    component: ToggleHost,
    regions: ['body']
};
function createDispatchCaptureRenderer(onCapture) {
    function DispatchCapture(props) {
        React.useEffect(() => {
            onCapture(props.helpers.dispatch);
        }, [props.helpers.dispatch]);
        return null;
    }
    return {
        type: 'dispatch-capture',
        component: DispatchCapture
    };
}
function createScope(data) {
    return {
        id: 'root',
        path: '$',
        get(path) {
            return path.split('.').reduce((current, segment) => {
                if (current == null || typeof current !== 'object') {
                    return undefined;
                }
                return current[segment];
            }, data);
        },
        has(path) {
            return this.get(path) !== undefined;
        },
        readOwn: () => data,
        value: data,
        read: () => data,
        update: () => undefined
    };
}
describe('createSchemaRenderer', () => {
    it('renders compiled schema in React', () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [{ type: 'text', text: 'Hello renderer' }]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        expect(screen.getByText('Hello renderer')).toBeTruthy();
    });
    it('renders precompiled nodes passed through helpers.render', () => {
        const registry = createRendererRegistry([textRenderer]);
        const runtime = createRendererRuntime({
            registry,
            env,
            expressionCompiler: createExpressionCompiler(createFormulaCompiler())
        });
        const compiledNode = runtime.compile({
            type: 'text',
            text: 'Compiled hello'
        });
        const hostRenderer = {
            type: 'host',
            component: (props) => _jsx("section", { children: props.helpers.render(compiledNode) })
        };
        const SchemaRenderer = createSchemaRenderer([hostRenderer, textRenderer]);
        render(_jsx(SchemaRenderer, { schema: { type: 'host' }, env: env, formulaCompiler: createFormulaCompiler() }));
        expect(screen.getByText('Compiled hello')).toBeTruthy();
    });
    it('loads xui imports and dispatches imported namespace actions', async () => {
        const importLoader = {
            load: vi.fn(async () => ({
                createNamespace: () => ({
                    kind: 'import',
                    invoke: async (method, payload) => ({
                        ok: true,
                        data: `${method}:${String(payload?.id ?? '')}`
                    })
                })
            }))
        };
        const SchemaRenderer = createSchemaRenderer([buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'button',
                label: 'Run import action',
                'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                onClick: {
                    action: 'demo:open',
                    args: {
                        id: 'record-1'
                    }
                }
            }, env: {
                ...env,
                importLoader
            }, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Run import action'));
        await waitFor(() => {
            expect(importLoader.load).toHaveBeenCalledWith({ from: 'demo-lib', as: 'demo' });
        });
    });
    it('dedupes repeated imports within one action scope and shares them with descendants', async () => {
        const importLoader = {
            load: vi.fn(async (spec) => ({
                createNamespace: () => ({
                    kind: 'import',
                    invoke: async (method, payload) => ({
                        ok: true,
                        data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
                    })
                })
            }))
        };
        const SchemaRenderer = createSchemaRenderer([pageRenderer, scopedHostRenderer, dispatchProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                'xui:imports': [{ from: 'demo-lib', as: 'demo' }],
                body: [
                    {
                        type: 'dispatch-probe',
                        label: 'Run parent import',
                        resultKey: 'parent-import-result',
                        runAction: {
                            action: 'demo:ping',
                            args: { value: 'parent' }
                        }
                    },
                    {
                        type: 'scoped-host',
                        body: [
                            {
                                type: 'dispatch-probe',
                                label: 'Run child import',
                                resultKey: 'child-import-result',
                                runAction: {
                                    action: 'demo:ping',
                                    args: { value: 'child' }
                                }
                            }
                        ]
                    },
                    {
                        type: 'dispatch-probe',
                        label: 'Run sibling import',
                        resultKey: 'sibling-import-result',
                        runAction: {
                            action: 'demo:ping',
                            args: { value: 'sibling' }
                        }
                    }
                ]
            }, env: {
                ...env,
                importLoader
            }, formulaCompiler: sharedFormulaCompiler }));
        await waitFor(() => {
            expect(importLoader.load).toHaveBeenCalledTimes(1);
        });
        fireEvent.click(screen.getByText('Run parent import'));
        fireEvent.click(screen.getByText('Run child import'));
        fireEvent.click(screen.getByText('Run sibling import'));
        await waitFor(() => {
            expect(screen.getByTestId('parent-import-result').textContent).toBe('demo-lib:ping:parent');
            expect(screen.getByTestId('child-import-result').textContent).toBe('demo-lib:ping:child');
            expect(screen.getByTestId('sibling-import-result').textContent).toBe('demo-lib:ping:sibling');
        });
    });
    it('keeps child imports scoped locally and disposes them on unmount', async () => {
        const dispose = vi.fn();
        const importLoader = {
            load: vi.fn(async (spec) => ({
                createNamespace: () => ({
                    kind: 'import',
                    dispose,
                    invoke: async (method, payload) => ({
                        ok: true,
                        data: `${spec.as}:${method}:${String(payload?.value ?? '')}`
                    })
                })
            }))
        };
        let retainedDispatch;
        const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
            retainedDispatch = dispatch;
        });
        const SchemaRenderer = createSchemaRenderer([
            pageRenderer,
            toggleHostRenderer,
            scopedHostRenderer,
            dispatchCaptureRenderer,
            dispatchProbeRenderer
        ]);
        cleanup();
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'toggle-host',
                        body: [
                            {
                                type: 'scoped-host',
                                'xui:imports': [{ from: 'child-lib', as: 'child' }],
                                body: [
                                    { type: 'dispatch-capture' },
                                    {
                                        type: 'dispatch-probe',
                                        label: 'Run child scoped import',
                                        resultKey: 'child-scoped-import-result',
                                        runAction: {
                                            action: 'child:ping',
                                            args: { value: 'mounted' }
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'dispatch-probe',
                        label: 'Run root child import',
                        resultKey: 'root-child-import-result',
                        runAction: {
                            action: 'child:ping',
                            args: { value: 'root' }
                        }
                    }
                ]
            }, env: {
                ...env,
                importLoader
            }, formulaCompiler: sharedFormulaCompiler }));
        await waitFor(() => {
            expect(retainedDispatch).toBeTypeOf('function');
        });
        expect(importLoader.load).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByText('Run child scoped import'));
        await waitFor(() => {
            expect(screen.getByTestId('child-scoped-import-result').textContent).toBe('child:ping:mounted');
        });
        const beforeUnmountResult = await retainedDispatch({
            action: 'child:ping',
            args: { value: 'captured' }
        });
        expect(beforeUnmountResult).toMatchObject({ ok: true, data: 'child:ping:captured' });
        fireEvent.click(screen.getByText('Run root child import'));
        await waitFor(() => {
            expect(screen.getByTestId('root-child-import-result').textContent).toContain('Unsupported action: child:ping');
        });
        fireEvent.click(screen.getByText('Hide child boundary'));
        await waitFor(() => {
            expect(screen.getByText('Show child boundary')).toBeTruthy();
        });
        await waitFor(() => {
            expect(dispose).toHaveBeenCalledTimes(1);
        });
        const afterUnmountResult = await retainedDispatch({
            action: 'child:ping',
            args: { value: 'after-unmount' }
        });
        expect(afterUnmountResult).toMatchObject({
            ok: false,
            error: expect.any(Error)
        });
        expect(String(afterUnmountResult.error)).toContain('Unsupported action: child:ping');
        cleanup();
    });
    it('surfaces import loading and load failures through dispatch results and env notifications', async () => {
        let resolveModule;
        const importLoader = {
            load: vi.fn((spec) => {
                if (spec.as === 'slow') {
                    return new Promise((resolve) => {
                        resolveModule = resolve;
                    });
                }
                return Promise.reject(new Error('loader exploded'));
            })
        };
        const notify = vi.fn();
        const onError = vi.fn();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, dispatchProbeRenderer]);
        cleanup();
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'dispatch-probe',
                        label: 'Run loading import',
                        resultKey: 'loading-import-result',
                        'xui:imports': [{ from: 'slow-lib', as: 'slow' }],
                        runAction: {
                            action: 'slow:ping'
                        }
                    },
                    {
                        type: 'dispatch-probe',
                        label: 'Run failed import',
                        resultKey: 'failed-import-result',
                        'xui:imports': [{ from: 'broken-lib', as: 'broken' }],
                        runAction: {
                            action: 'broken:ping'
                        }
                    }
                ]
            }, env: {
                ...env,
                notify,
                monitor: {
                    onError
                },
                importLoader
            }, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Run loading import'));
        await waitFor(() => {
            expect(screen.getByTestId('loading-import-result').textContent).toContain('Imported namespace slow is still loading');
        });
        await waitFor(() => {
            expect(notify).toHaveBeenCalledWith('error', 'Imported namespace broken failed to load: loader exploded');
        });
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            phase: 'render',
            error: expect.objectContaining({ message: 'Imported namespace broken failed to load: loader exploded' })
        }));
        fireEvent.click(screen.getByText('Run failed import'));
        await waitFor(() => {
            expect(screen.getByTestId('failed-import-result').textContent).toContain('Imported namespace broken failed to load: loader exploded');
        });
        resolveModule?.({
            createNamespace: () => ({
                kind: 'import',
                invoke: async () => ({ ok: true })
            })
        });
        cleanup();
    });
    it('supports useScopeSelector with parent scopes that do not expose a store', () => {
        const SchemaRenderer = createSchemaRenderer([selectorRenderer]);
        const { rerender } = render(_jsx(SchemaRenderer, { schema: { type: 'selector-text' }, env: env, formulaCompiler: createFormulaCompiler(), parentScope: createScope({ message: 'Scoped hello' }) }));
        expect(screen.getByText('Scoped hello')).toBeTruthy();
        rerender(_jsx(SchemaRenderer, { schema: { type: 'selector-text' }, env: env, formulaCompiler: createFormulaCompiler(), parentScope: createScope({ message: 'Scoped update' }) }));
        expect(screen.getByText('Scoped update')).toBeTruthy();
    });
    it('provides nested action scope and component registry boundaries through the render tree', () => {
        const SchemaRenderer = createSchemaRenderer([scopedHostRenderer, actionScopeProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'scoped-host',
                body: [{ type: 'action-scope-probe' }]
            }, env: env, formulaCompiler: sharedFormulaCompiler }));
        expect(screen.getByTestId('action-scope-id').textContent).toContain('action-scope');
        expect(screen.getByTestId('component-registry-id').textContent).toContain('component-registry');
    });
    it('prefers nested action scopes and component registries over parent providers', async () => {
        const SchemaRenderer = createSchemaRenderer([
            pageRenderer,
            scopedHostRenderer,
            namespaceProviderRenderer,
            componentHandleProviderRenderer,
            dispatchProbeRenderer
        ]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
                    { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
                    {
                        type: 'dispatch-probe',
                        label: 'Run outer namespace',
                        resultKey: 'outer-namespace-result',
                        runAction: {
                            action: 'demo:ping',
                            args: { value: 'root' }
                        }
                    },
                    {
                        type: 'dispatch-probe',
                        label: 'Run outer handle',
                        resultKey: 'outer-handle-result',
                        runAction: {
                            action: 'component:ping',
                            componentName: 'shared',
                            args: { value: 'root' }
                        }
                    },
                    {
                        type: 'scoped-host',
                        body: [
                            { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                            { type: 'component-handle-provider', componentName: 'shared', label: 'inner-handle' },
                            {
                                type: 'dispatch-probe',
                                label: 'Run inner namespace',
                                resultKey: 'inner-namespace-result',
                                runAction: {
                                    action: 'demo:ping',
                                    args: { value: 'child' }
                                }
                            },
                            {
                                type: 'dispatch-probe',
                                label: 'Run inner handle',
                                resultKey: 'inner-handle-result',
                                runAction: {
                                    action: 'component:ping',
                                    componentName: 'shared',
                                    args: { value: 'child' }
                                }
                            }
                        ]
                    }
                ]
            }, env: env, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Run outer namespace'));
        fireEvent.click(screen.getByText('Run outer handle'));
        fireEvent.click(screen.getByText('Run inner namespace'));
        fireEvent.click(screen.getByText('Run inner handle'));
        await waitFor(() => {
            expect(screen.getByTestId('outer-namespace-result').textContent).toBe('outer-ns:ping:root');
            expect(screen.getByTestId('outer-handle-result').textContent).toBe('outer-handle:ping:root');
            expect(screen.getByTestId('inner-namespace-result').textContent).toBe('inner-ns:ping:child');
            expect(screen.getByTestId('inner-handle-result').textContent).toBe('inner-handle:ping:child');
        });
    });
    it('falls back to parent providers after a nested boundary tears down', async () => {
        let retainedDispatch;
        const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
            retainedDispatch = dispatch;
        });
        const SchemaRenderer = createSchemaRenderer([
            pageRenderer,
            toggleHostRenderer,
            scopedHostRenderer,
            namespaceProviderRenderer,
            componentHandleProviderRenderer,
            dispatchCaptureRenderer
        ]);
        cleanup();
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
                    { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
                    {
                        type: 'toggle-host',
                        body: [
                            {
                                type: 'scoped-host',
                                body: [
                                    { type: 'namespace-provider', namespace: 'demo', label: 'inner-ns' },
                                    { type: 'component-handle-provider', componentName: 'shared', label: 'inner-handle' },
                                    { type: 'dispatch-capture' }
                                ]
                            }
                        ]
                    }
                ]
            }, env: env, formulaCompiler: sharedFormulaCompiler }));
        await waitFor(() => {
            expect(retainedDispatch).toBeTypeOf('function');
        });
        const innerNamespaceResult = await retainedDispatch({
            action: 'demo:ping',
            args: { value: 'live' }
        });
        const innerHandleResult = await retainedDispatch({
            action: 'component:ping',
            componentName: 'shared',
            args: { value: 'live' }
        });
        expect(innerNamespaceResult).toMatchObject({ ok: true, data: 'inner-ns:ping:live' });
        expect(innerHandleResult).toMatchObject({ ok: true, data: 'inner-handle:ping:live' });
        fireEvent.click(screen.getByText('Hide child boundary'));
        await waitFor(() => {
            expect(screen.getByText('Show child boundary')).toBeTruthy();
        });
        const fallbackNamespaceResult = await retainedDispatch({
            action: 'demo:ping',
            args: { value: 'after-unmount' }
        });
        const fallbackHandleResult = await retainedDispatch({
            action: 'component:ping',
            componentName: 'shared',
            args: { value: 'after-unmount' }
        });
        expect(fallbackNamespaceResult).toMatchObject({ ok: true, data: 'outer-ns:ping:after-unmount' });
        expect(fallbackHandleResult).toMatchObject({ ok: true, data: 'outer-handle:ping:after-unmount' });
        cleanup();
    });
    it('reopens dialog with fresh child providers and falls back after close', async () => {
        const capturedDispatches = [];
        const dispatchCaptureRenderer = createDispatchCaptureRenderer((dispatch) => {
            capturedDispatches.push(dispatch);
        });
        const SchemaRenderer = createSchemaRenderer([
            pageRenderer,
            textRenderer,
            buttonRenderer,
            scopedHostRenderer,
            namespaceProviderRenderer,
            componentHandleProviderRenderer,
            dispatchCaptureRenderer
        ]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    { type: 'namespace-provider', namespace: 'demo', label: 'outer-ns' },
                    { type: 'component-handle-provider', componentName: 'shared', label: 'outer-handle' },
                    {
                        type: 'button',
                        label: 'Open provider dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Provider dialog',
                                body: [
                                    {
                                        type: 'scoped-host',
                                        body: [
                                            { type: 'namespace-provider', namespace: 'demo', label: 'dialog-ns' },
                                            { type: 'component-handle-provider', componentName: 'shared', label: 'dialog-handle' },
                                            { type: 'dispatch-capture' },
                                            { type: 'text', text: 'Dialog provider content' }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Open provider dialog'));
        expect(await screen.findByText('Dialog provider content')).toBeTruthy();
        await waitFor(() => {
            expect(capturedDispatches.length).toBe(1);
        });
        const firstDialogDispatch = capturedDispatches[0];
        const firstDialogNamespaceResult = await firstDialogDispatch({
            action: 'demo:ping',
            args: { value: 'first-open' }
        });
        const firstDialogHandleResult = await firstDialogDispatch({
            action: 'component:ping',
            componentName: 'shared',
            args: { value: 'first-open' }
        });
        expect(firstDialogNamespaceResult).toMatchObject({ ok: true, data: 'dialog-ns:ping:first-open' });
        expect(firstDialogHandleResult).toMatchObject({ ok: true, data: 'dialog-handle:ping:first-open' });
        fireEvent.click(document.querySelector('[data-slot="dialog-close"]'));
        await waitFor(() => {
            expect(screen.queryByText('Dialog provider content')).toBeNull();
        });
        const fallbackNamespaceResult = await firstDialogDispatch({
            action: 'demo:ping',
            args: { value: 'after-close' }
        });
        const fallbackHandleResult = await firstDialogDispatch({
            action: 'component:ping',
            componentName: 'shared',
            args: { value: 'after-close' }
        });
        expect(fallbackNamespaceResult).toMatchObject({ ok: true, data: 'outer-ns:ping:after-close' });
        expect(fallbackHandleResult).toMatchObject({ ok: true, data: 'outer-handle:ping:after-close' });
        fireEvent.click(screen.getByText('Open provider dialog'));
        expect(await screen.findByText('Dialog provider content')).toBeTruthy();
        await waitFor(() => {
            expect(capturedDispatches.length).toBe(2);
        });
        const secondDialogDispatch = capturedDispatches[1];
        expect(secondDialogDispatch).not.toBe(firstDialogDispatch);
        const secondDialogNamespaceResult = await secondDialogDispatch({
            action: 'demo:ping',
            args: { value: 'second-open' }
        });
        const secondDialogHandleResult = await secondDialogDispatch({
            action: 'component:ping',
            componentName: 'shared',
            args: { value: 'second-open' }
        });
        expect(secondDialogNamespaceResult).toMatchObject({ ok: true, data: 'dialog-ns:ping:second-open' });
        expect(secondDialogHandleResult).toMatchObject({ ok: true, data: 'dialog-handle:ping:second-open' });
    });
    it('preserves field state across unrelated host rerenders', () => {
        const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);
        function Host() {
            const [tick, setTick] = React.useState(0);
            return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setTick((current) => current + 1), children: ["Rerender host ", tick] }), _jsx(SchemaRenderer, { schema: probeFormSchema, data: {
                            currentUser: { name: 'Architect' }
                        }, env: env, formulaCompiler: sharedFormulaCompiler })] }));
        }
        cleanup();
        const view = render(_jsx(Host, {}));
        const canvas = within(view.container);
        const input = canvas.getByLabelText('Email');
        fireEvent.change(input, { target: { value: 'a' } });
        expect(canvas.getByLabelText('Email').value).toBe('a');
        fireEvent.click(canvas.getByText('Rerender host 0'));
        expect(canvas.getByLabelText('Email').value).toBe('a');
    });
    it('updates page scope data without recreating the form runtime', () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeInputRenderer, pageValueProbeRenderer]);
        function Host() {
            const [name, setName] = React.useState('Architect');
            return (_jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setName('Operator'), children: "Rename user" }), _jsx(SchemaRenderer, { schema: pageWithProbeFormSchema, data: {
                            currentUser: { name }
                        }, env: env, formulaCompiler: sharedFormulaCompiler })] }));
        }
        cleanup();
        const view = render(_jsx(Host, {}));
        const canvas = within(view.container);
        fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
        expect(canvas.getByLabelText('Email').value).toBe('a');
        expect(canvas.getByTestId('page-value').textContent).toBe('Architect');
        fireEvent.click(canvas.getByText('Rename user'));
        expect(canvas.getByTestId('page-value').textContent).toBe('Operator');
        expect(canvas.getByLabelText('Email').value).toBe('a');
    });
    it('preserves form state when fragment render data is recreated on host rerender', () => {
        const SchemaRenderer = createSchemaRenderer([fragmentRenderHostRenderer, formRenderer, probeInputRenderer]);
        cleanup();
        const view = render(_jsx(SchemaRenderer, { schema: { type: 'fragment-render-host' }, env: env, formulaCompiler: sharedFormulaCompiler }));
        const canvas = within(view.container);
        fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
        expect(canvas.getByLabelText('Email').value).toBe('a');
        fireEvent.click(canvas.getByText('Refresh fragment 0'));
        expect(canvas.getByLabelText('Email').value).toBe('a');
    });
    it('recreates the form runtime when env identity changes', () => {
        const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);
        function Host() {
            const [tick, setTick] = React.useState(0);
            const unstableEnv = React.useMemo(() => ({
                ...env,
                functions: {
                    tick: () => tick
                }
            }), [tick]);
            return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setTick((current) => current + 1), children: ["Refresh env ", tick] }), _jsx(SchemaRenderer, { schema: probeFormSchema, data: {
                            currentUser: { name: 'Architect' }
                        }, env: unstableEnv, formulaCompiler: sharedFormulaCompiler })] }));
        }
        cleanup();
        const view = render(_jsx(Host, {}));
        const canvas = within(view.container);
        fireEvent.change(canvas.getByLabelText('Email'), { target: { value: 'a' } });
        expect(canvas.getByLabelText('Email').value).toBe('a');
        fireEvent.click(canvas.getByText('Refresh env 0'));
        expect(canvas.getByLabelText('Email').value).toBe('');
    });
    it('renders dialog content after dispatching a dialog action', async () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Inspect record',
                                body: [{ type: 'text', text: 'Dialog hello' }]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Open dialog'));
        expect(await screen.findByText('Inspect record')).toBeTruthy();
        expect(await screen.findByText('Dialog hello')).toBeTruthy();
        fireEvent.click(document.querySelector('[data-slot="dialog-close"]'));
        await waitFor(() => {
            expect(screen.queryByText('Dialog hello')).toBeNull();
        });
    });
    it('renders schema-based dialog titles through the unified render path', async () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open compiled dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: { type: 'text', text: 'Compiled dialog title' },
                                body: [{ type: 'text', text: 'Dialog body' }]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Open compiled dialog'));
        expect(await screen.findByText('Compiled dialog title')).toBeTruthy();
        expect(await screen.findByText('Dialog body')).toBeTruthy();
    });
    it('preserves dialog form state across host rerenders and page data updates', async () => {
        const SchemaRenderer = createSchemaRenderer([
            pageRenderer,
            textRenderer,
            buttonRenderer,
            formRenderer,
            probeInputRenderer
        ]);
        function Host() {
            const [tick, setTick] = React.useState(0);
            const [name, setName] = React.useState('Architect');
            return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setTick((current) => current + 1), children: ["Rerender host ", tick] }), _jsx("button", { type: "button", onClick: () => setName('Operator'), children: "Rename user" }), _jsx(SchemaRenderer, { schema: {
                            type: 'page',
                            body: [
                                {
                                    type: 'button',
                                    label: 'Open dialog',
                                    onClick: {
                                        action: 'dialog',
                                        dialog: {
                                            title: { type: 'text', text: 'Dialog ${currentUser.name}' },
                                            body: [
                                                { type: 'text', text: 'Dialog user ${currentUser.name}' },
                                                probeFormSchema
                                            ]
                                        }
                                    }
                                }
                            ]
                        }, data: {
                            currentUser: { name }
                        }, env: env, formulaCompiler: sharedFormulaCompiler })] }));
        }
        cleanup();
        const view = render(_jsx(Host, {}));
        const canvas = within(view.container);
        fireEvent.click(canvas.getByText('Open dialog'));
        expect(await screen.findByText('Dialog Architect')).toBeTruthy();
        expect(await screen.findByText('Dialog user Architect')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
        expect(screen.getByLabelText('Email').value).toBe('alice@example.com');
        fireEvent.click(canvas.getByText('Rerender host 0'));
        expect(screen.getByLabelText('Email').value).toBe('alice@example.com');
        expect(screen.getByText('Dialog Architect')).toBeTruthy();
        fireEvent.click(canvas.getByText('Rename user'));
        expect(await screen.findByText('Dialog Operator')).toBeTruthy();
        expect(await screen.findByText('Dialog user Operator')).toBeTruthy();
        expect(screen.getByLabelText('Email').value).toBe('alice@example.com');
    });
    it('updates dialog title and body when dialog scope changes', async () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        cleanup();
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open scoped dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: { type: 'text', text: 'Dialog ${message}' },
                                body: [
                                    { type: 'text', text: 'Body ${message}' },
                                    {
                                        type: 'button',
                                        label: 'Update dialog message',
                                        onClick: {
                                            action: 'setValue',
                                            componentPath: 'message',
                                            value: 'updated'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }, data: { message: 'initial' }, env: env, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Open scoped dialog'));
        expect(await screen.findByText('Dialog initial')).toBeTruthy();
        expect(await screen.findByText('Body initial')).toBeTruthy();
        fireEvent.click(screen.getByText('Update dialog message'));
        expect(await screen.findByText('Dialog updated')).toBeTruthy();
        expect(await screen.findByText('Body updated')).toBeTruthy();
    });
    it('creates a fresh dialog scope when reopening a dialog', async () => {
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        cleanup();
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open fresh dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Fresh dialog',
                                body: [
                                    { type: 'text', text: '${draft}' },
                                    {
                                        type: 'button',
                                        label: 'Set draft',
                                        onClick: {
                                            action: 'setValue',
                                            componentPath: 'draft',
                                            value: 'changed'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: sharedFormulaCompiler }));
        fireEvent.click(screen.getByText('Open fresh dialog'));
        fireEvent.click(await screen.findByText('Set draft'));
        expect(await screen.findByText('changed')).toBeTruthy();
        fireEvent.click(document.querySelector('[data-slot="dialog-close"]'));
        await waitFor(() => {
            expect(screen.queryByText('changed')).toBeNull();
        });
        fireEvent.click(screen.getByText('Open fresh dialog'));
        expect(await screen.findByText('Fresh dialog')).toBeTruthy();
        expect(screen.queryByText('changed')).toBeNull();
    });
    it('supports wrapComponent plugins in the renderer pipeline', () => {
        const wrapped = vi.fn();
        const plugin = {
            name: 'wrap-text',
            wrapComponent(definition) {
                if (definition.type !== 'text') {
                    return definition;
                }
                return {
                    ...definition,
                    component: (props) => {
                        wrapped(props.meta.label ?? props.props.text);
                        return (_jsxs("div", { children: [_jsx("span", { "data-testid": "wrapped-prefix", children: "Wrapped" }), _jsx(definition.component, { ...props })] }));
                    }
                };
            }
        };
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [{ type: 'text', text: 'Wrapped hello' }]
            }, env: env, formulaCompiler: createFormulaCompiler(), plugins: [plugin] }));
        expect(screen.getByTestId('wrapped-prefix')).toBeTruthy();
        expect(screen.getByText('Wrapped hello')).toBeTruthy();
        expect(wrapped).toHaveBeenCalledWith('Wrapped hello');
    });
    it('emits render monitor callbacks for rendered nodes', async () => {
        const onRenderStart = vi.fn();
        const onRenderEnd = vi.fn();
        const SchemaRenderer = createSchemaRenderer([textRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'text',
                text: 'Monitored render'
            }, env: {
                ...env,
                monitor: {
                    onRenderStart,
                    onRenderEnd
                }
            }, formulaCompiler: createFormulaCompiler() }));
        expect(screen.getByText('Monitored render')).toBeTruthy();
        await waitFor(() => {
            expect(onRenderStart).toHaveBeenCalledWith(expect.objectContaining({
                type: 'text'
            }));
            expect(onRenderEnd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'text',
                durationMs: expect.any(Number)
            }));
        });
    });
    it('projects form errors by owner path and source kind', async () => {
        const SchemaRenderer = createSchemaRenderer([formRenderer, compositeProbeRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'form',
                body: [{ type: 'composite-probe' }]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Validate root'));
        fireEvent.click(screen.getByText('Validate child'));
        await waitFor(() => {
            expect(screen.getByTestId('root-error').textContent).toBe('Metadata requires at least one entry');
            expect(screen.getByTestId('child-error').textContent).toBe('Entry 1 value is required');
            expect(screen.getByTestId('owned-count').textContent).toBe('2');
            expect(screen.getByTestId('owned-root-error').textContent).toBe('Metadata requires at least one entry');
            expect(screen.getByTestId('child-state-error').textContent).toBe('Entry 1 value is required');
            expect(screen.getByTestId('node-state-error').textContent).toBe('Metadata requires at least one entry');
            expect(screen.getByTestId('aggregate-error').textContent).toBe('Metadata requires at least one entry');
            expect(screen.getByTestId('field-error').textContent).toBe('Entry 1 value is required');
        });
    });
});
describe('renderer slot helpers', () => {
    it('prefers region content over prop, meta, and fallback values', () => {
        const regionContent = _jsx("span", { children: "Region title" });
        const slotContent = resolveRendererSlotContent({
            props: { title: 'Prop title' },
            meta: { label: 'Meta title' },
            regions: {
                title: {
                    key: 'title',
                    path: '$.title',
                    node: [],
                    render: () => regionContent
                }
            }
        }, 'title', { metaKey: 'label', fallback: 'Fallback title' });
        expect(slotContent).toBe(regionContent);
    });
    it('falls back from prop to meta and then fallback when slot content is absent', () => {
        const propContent = resolveRendererSlotContent({
            props: { label: 'Prop label' },
            meta: { label: 'Meta label' },
            regions: {}
        }, 'label', { metaKey: 'label', fallback: 'Fallback label' });
        const metaContent = resolveRendererSlotContent({
            props: {},
            meta: { label: 'Meta label' },
            regions: {}
        }, 'label', { metaKey: 'label', fallback: 'Fallback label' });
        const fallbackContent = resolveRendererSlotContent({
            props: {},
            meta: {},
            regions: {}
        }, 'label', { metaKey: 'label', fallback: 'Fallback label' });
        expect(propContent).toBe('Prop label');
        expect(metaContent).toBe('Meta label');
        expect(fallbackContent).toBe('Fallback label');
    });
    it('treats nullish and false slot content as absent but keeps renderable arrays and zero', () => {
        expect(hasRendererSlotContent(undefined)).toBe(false);
        expect(hasRendererSlotContent(null)).toBe(false);
        expect(hasRendererSlotContent(false)).toBe(false);
        expect(hasRendererSlotContent([])).toBe(false);
        expect(hasRendererSlotContent([null, false, undefined])).toBe(false);
        expect(hasRendererSlotContent([null, _jsx("span", { children: "Value" }, "value")])).toBe(true);
        expect(hasRendererSlotContent(0)).toBe(true);
        expect(hasRendererSlotContent('')).toBe(true);
    });
});
describe('reactive meta', () => {
    it('re-evaluates disabled expression when form scope changes', async () => {
        cleanup();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeQueryInputRenderer, probeButtonRenderer]);
        const schema = {
            type: 'page',
            body: [
                {
                    type: 'form',
                    id: 'search-form',
                    data: { query: '' },
                    body: [
                        {
                            type: 'probe-button',
                            disabled: '${!query}'
                        },
                        {
                            type: 'probe-query-input'
                        }
                    ]
                }
            ]
        };
        render(_jsx(SchemaRenderer, { schema: schema, data: {}, env: env, formulaCompiler: sharedFormulaCompiler }));
        const searchButton = screen.getByRole('button', { name: 'Search' });
        expect(searchButton.disabled).toBe(true);
        const queryInput = screen.getByRole('textbox', { name: 'Query' });
        fireEvent.change(queryInput, { target: { value: 'alice' } });
        await waitFor(() => {
            expect(searchButton.disabled).toBe(false);
        });
        cleanup();
    });
    it('re-evaluates disabled expression when page scope changes', async () => {
        cleanup();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, probeButtonRenderer]);
        const schema = {
            type: 'page',
            body: [
                {
                    type: 'probe-button',
                    disabled: '${!ready}'
                }
            ]
        };
        const { rerender } = render(_jsx(SchemaRenderer, { schema: schema, data: { ready: false }, env: env, formulaCompiler: sharedFormulaCompiler }));
        const searchButton = screen.getByRole('button', { name: 'Search' });
        expect(searchButton.disabled).toBe(true);
        rerender(_jsx(SchemaRenderer, { schema: schema, data: { ready: true }, env: env, formulaCompiler: sharedFormulaCompiler }));
        await waitFor(() => {
            expect(searchButton.disabled).toBe(false);
        });
        cleanup();
    });
    it('renders dialog with drag handle (DialogHeader) around the title', async () => {
        cleanup();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open drag-handle dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Draggable title',
                                body: [{ type: 'text', text: 'Dialog content' }]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Open drag-handle dialog'));
        const titleEl = await screen.findByText('Draggable title');
        const header = titleEl.closest('[data-slot="dialog-header"]');
        expect(header).toBeTruthy();
        expect(header.className).toContain('cursor-grab');
    });
    it('applies inline transform for draggable dialogs instead of Tailwind centering', async () => {
        cleanup();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open transform dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Drag test',
                                body: [{ type: 'text', text: 'Body' }]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Open transform dialog'));
        const content = await screen.findByRole('dialog');
        expect(content.style.transform).toBe('translate(-50%, -50%)');
        expect(content.className).not.toContain('translate-x-[-50%]');
    });
    it('registers drag listeners on pointerdown and updates transform', async () => {
        cleanup();
        const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
        render(_jsx(SchemaRenderer, { schema: {
                type: 'page',
                body: [
                    {
                        type: 'button',
                        label: 'Open pointer dialog',
                        onClick: {
                            action: 'dialog',
                            dialog: {
                                title: 'Drag me',
                                body: [{ type: 'text', text: 'Content' }]
                            }
                        }
                    }
                ]
            }, env: env, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByText('Open pointer dialog'));
        const content = await screen.findByRole('dialog');
        const header = content.querySelector('[data-slot="dialog-header"]');
        expect(content.style.transform).toBe('translate(-50%, -50%)');
        expect(header.className).toContain('cursor-grab');
        fireEvent.pointerDown(header, { clientX: 500, clientY: 300, button: 0 });
        expect(content.style.transition).toBe('none');
        expect(content.style.transform).toBe('translate(-50%, -50%)');
    });
});
