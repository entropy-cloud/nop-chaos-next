export { fetchAmisRequest } from './core/ajax'
export { normalizeGraphQLResponse, transformGraphQLRequest } from './core/graphql'
export { splitPrefixUrl } from './core/url'
export { getAmisRuntimeAdapter, registerAmisRuntimeAdapter } from './adapter/index'
export { bindActions } from './page/action'
export { createAmisPageObject } from './page/page'
export { processSchemaValue } from './page/processor'
export { clearXuiComponentRegistry, registerXuiComponent, resolveXuiComponent, unregisterXuiComponent } from './page/registry'
export { transformPageJson } from './page/transform'
export type {
  AmisAction,
  AmisDictProvider,
  AmisFetcherResult,
  AmisPageObject,
  AmisPageProvider,
  AmisRequestOptions,
  AmisRuntimeAdapter,
  AmisSchemaRecord,
  AmisToastType,
  ProcessSchemaOptions
} from './types'
export { isAmisFetcherResult } from './types'
