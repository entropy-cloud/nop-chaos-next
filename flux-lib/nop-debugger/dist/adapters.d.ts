import type { ActionContext, RendererEnv, RendererPlugin } from '@nop-chaos/flux-core';
import { type NormalizedRedactionOptions } from './redaction';
import type { NopDebuggerStore } from './store';
export declare function createDebuggerPlugin(store: NopDebuggerStore): RendererPlugin;
export declare function decorateDebuggerEnv(input: {
    enabled: boolean;
    env: RendererEnv;
    store: NopDebuggerStore;
    redaction: NormalizedRedactionOptions;
    requestState: Map<string, {
        startedAt: number;
    }>;
}): RendererEnv;
export declare function appendActionErrorEvent(store: NopDebuggerStore, error: unknown, ctx: ActionContext): void;
