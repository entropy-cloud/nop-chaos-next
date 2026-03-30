import type { ActionContext, ActionScope, ComponentHandleRegistry, CompiledSchemaNode, FormRuntime, PageRuntime, RendererHelpers, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
export { RenderNodes } from './render-nodes';
export declare function mergeActionContext(base: {
    runtime: RendererRuntime;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
    node?: CompiledSchemaNode;
}, partial?: Partial<ActionContext>): ActionContext;
export declare const EMPTY_SCOPE_DATA: Record<string, any>;
export declare function createHelpers(input: {
    runtime: RendererRuntime;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
    node?: CompiledSchemaNode;
}): RendererHelpers;
