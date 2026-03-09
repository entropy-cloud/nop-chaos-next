declare module "systemjs" {
  interface SystemJSStatic {
    import(id: string): Promise<any>
    set(id: string, module: any): void
    get(id: string): any
    has(id: string): boolean
    delete(id: string): boolean | ((updater: (exports: any) => void) => void)
    newModule(exports: any): any
    addImportMap(importMap: {
      imports?: Record<string, string>
      scopes?: Record<string, Record<string, string>>
    }): void
    resolve(id: string, parentUrl?: string): string
    register(name: string, deps: string[], declare: any): void
    register(deps: string[], declare: any): void
  }

  const SystemJS: SystemJSStatic
  export default SystemJS
  export { SystemJS }
}
