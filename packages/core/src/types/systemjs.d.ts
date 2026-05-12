declare module 'systemjs' {
  export interface SystemApi {
    import<T = unknown>(url: string): Promise<T>;
    addImportMap(map: { imports: Record<string, string> }): void;
    set(name: string, module: unknown): void;
  }

  const System: SystemApi;
  export { System };
  export default System;
}

declare global {
  var System: import('systemjs').SystemApi;
}

export {};
