export interface PageTransformerContext {
  schemaPath: string;
  pageType: 'amis' | 'flux';
}

export type PageTransformFn<T = Record<string, unknown>> = (
  schema: T,
  context: PageTransformerContext,
) => T | undefined | void | Promise<T> | Promise<undefined> | Promise<void>;

export interface PageTransformerRegistration<T = Record<string, unknown>> {
  id: string;
  order?: number;
  transform: PageTransformFn<T>;
}
