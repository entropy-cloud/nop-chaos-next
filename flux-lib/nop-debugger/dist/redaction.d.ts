import type { NopDebuggerRedactionOptions } from './types';
export type NormalizedRedactionOptions = Required<Pick<NopDebuggerRedactionOptions, 'enabled' | 'redactKeys' | 'mask' | 'maxDepth'>> & Pick<NopDebuggerRedactionOptions, 'redactValue' | 'allowValue'>;
export declare function normalizeRedactionOptions(options: NopDebuggerRedactionOptions | undefined): NormalizedRedactionOptions;
export declare function redactData(value: unknown, redaction: NormalizedRedactionOptions, path?: string[], depth?: number): unknown;
