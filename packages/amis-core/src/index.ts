export { getAmisRuntimeAdapter, registerAmisRuntimeAdapter } from './adapter/index'
export { bindActions } from './page/action'
export { createAmisPageObject } from './page/page'
export { processSchemaValue } from './page/processor'
export { transformPageJson } from './page/transform'
export type {
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
