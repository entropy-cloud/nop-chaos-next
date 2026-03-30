import type { ActionResult, ApiObject, ApiResponse, CompiledSchemaNode } from '@nop-chaos/flux-core';
import type { NopDebugEventNetworkSummary, NopDebuggerWindowConfig } from './types';
export declare function readWindowConfig(): Required<NopDebuggerWindowConfig> & {
    enabled: boolean;
};
export declare function createSessionId(id: string): string;
export declare function formatErrorDetail(error: unknown): string;
export declare function formatActionResult(result: ActionResult | undefined): "completed" | "cancelled" | "ok" | "failed";
export declare function summarizeApi(api: ApiObject): string;
export declare function summarizeValueShape(value: unknown): {
    responseType: string;
    keys: string[];
};
export declare function createRequestKey(api: ApiObject, nodeId?: string, path?: string): string;
export declare function buildNetworkSummary(input: {
    api: ApiObject;
    response?: ApiResponse<unknown>;
    aborted?: boolean;
}): NopDebugEventNetworkSummary;
export declare function normalizeCompiledRoot(node: CompiledSchemaNode | CompiledSchemaNode[]): {
    rootCount: number;
    firstType: string;
    firstPath: string;
};
