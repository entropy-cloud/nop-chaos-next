import { getAmisRuntimeAdapter } from '../adapter';
import { bindActions } from '../page/action';
import { transformPageJson } from '../page/transform';
import type { AmisFetcherResult, AmisRequestOptions } from '../types';
import { splitPrefixUrl } from './url';
import { buildSuccessResponse } from './ajaxMessages';

export async function handleSpecialRequest(
  options: AmisRequestOptions,
): Promise<AmisFetcherResult | null> {
  const adapter = getAmisRuntimeAdapter();
  const prefix = splitPrefixUrl(options.url);

  if (!prefix) {
    return null;
  }

  const [type, path] = prefix;

  if (type === 'action') {
    const action = options._page?.getAction(path);

    if (!action) {
      throw new Error(`Unknown amis action: ${path}`);
    }

    const result = await Promise.resolve(action(options, options._page));
    return result && typeof result === 'object' && 'status' in result && 'data' in result
      ? (result as AmisFetcherResult)
      : buildSuccessResponse(result ?? null);
  }

  if (type === 'dict') {
    return adapter.dictProvider.getDict(path, options);
  }

  if (type === 'page') {
    const schema = await adapter.pageProvider.getPage(path);
    const transformedSchema = await transformPageJson(schema);
    const boundSchema = options._page ? await bindActions(transformedSchema, options._page) : transformedSchema;
    return buildSuccessResponse(boundSchema);
  }

  return null;
}
