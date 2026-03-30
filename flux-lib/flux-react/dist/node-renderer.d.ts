import type { ActionScope, ComponentHandleRegistry, CompiledSchemaNode, FormRuntime, PageRuntime, ScopeRef } from '@nop-chaos/flux-core';
export declare function NodeRenderer(props: {
    node: CompiledSchemaNode;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
}): import("react/jsx-runtime").JSX.Element | null;
