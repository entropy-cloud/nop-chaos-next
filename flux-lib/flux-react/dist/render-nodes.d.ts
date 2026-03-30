import React from 'react';
import type { CompiledSchemaNode, RenderFragmentOptions, RenderNodeInput, RendererComponentProps, RendererRuntime } from '@nop-chaos/flux-core';
export declare function normalizeNodeInput(runtime: RendererRuntime, input: RenderNodeInput): CompiledSchemaNode | CompiledSchemaNode[] | null;
export declare function resolveRendererSlotContent(props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>, slotKey: string, options?: {
    metaKey?: string;
    fallback?: React.ReactNode;
}): React.ReactNode;
export declare function hasRendererSlotContent(content: React.ReactNode): boolean;
export declare function RenderNodes(props: {
    input: RenderNodeInput;
    options?: RenderFragmentOptions;
}): import("react/jsx-runtime").JSX.Element | null;
