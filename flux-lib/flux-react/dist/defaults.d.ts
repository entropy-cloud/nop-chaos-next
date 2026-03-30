import type { RendererDefinition, SchemaRendererProps } from '@nop-chaos/flux-core';
export declare function createDefaultRegistry(definitions?: RendererDefinition[]): import("@nop-chaos/flux-core").RendererRegistry;
export declare function createDefaultEnv(input?: Partial<SchemaRendererProps['env']>): {
    fetcher: (<T>(api: any) => Promise<{
        ok: boolean;
        status: number;
        data: T;
    }>) | import("@nop-chaos/flux-core").ApiFetcher;
    notify: (level: "info" | "success" | "warning" | "error", message: string) => void;
    navigate?: (to: string, options?: unknown) => void;
    confirm?: (message: string, options?: unknown) => Promise<boolean>;
    functions?: Record<string, (...args: any[]) => any>;
    filters?: Record<string, (input: any, ...args: any[]) => any>;
    importLoader?: import("@nop-chaos/flux-core").ImportedLibraryLoader;
    monitor?: import("@nop-chaos/flux-core").RendererMonitor;
};
