import { getAmisRuntimeAdapter } from '../adapter';
import type { AmisFetcherResult, AmisRequestOptions } from '../types';
import { isApiPayload } from '@nop-chaos/shared';
import { normalizeGraphQLResponse, transformGraphQLRequest } from './graphql';
import { normalizeBlobResponse } from './ajaxBlob';
import { getErrorMessages, normalizeErrMessage, normalizeMessage, normalizeNetworkError } from './ajaxMessages';
import { executeSharedRequest, prepareRequest } from './ajaxRequest';
import { handleSpecialRequest } from './ajaxSpecial';

function notifyResult(options: AmisRequestOptions, result: AmisFetcherResult) {
  if (options.silent || !isApiPayload(result.data) || !result.data.msg) {
    return;
  }

  const status = Number(result.data.status ?? -1);
  const adapter = getAmisRuntimeAdapter();
  const message = normalizeMessage(result.data.msg);

  if (options.useAlert) {
    void adapter.alert(message);
    return;
  }

  const type = status === 0 || status === 200 ? 'info' : 'error';
  adapter.notify(type, message);
}

async function executeNetworkRequest(options: AmisRequestOptions): Promise<AmisFetcherResult> {
  const graphqlRequest = transformGraphQLRequest(options);
  const preparedRequest = prepareRequest(graphqlRequest?.request ?? options);
  let response: Awaited<ReturnType<typeof executeSharedRequest>>;

  try {
    response = await executeSharedRequest({
      method: preparedRequest.method,
      url: preparedRequest.processedRequest.url,
      query: preparedRequest.requestQuery,
      data: preparedRequest.requestData,
      headers: preparedRequest.processedRequest.headers,
      withAuth: preparedRequest.processedRequest.withToken,
      responseType: preparedRequest.processedRequest.responseType,
      signal: preparedRequest.signal,
    });
  } catch (error) {
    return normalizeNetworkError(error);
  }

  const responseHeaders = response.headers;
  let data = response.data;

  if (graphqlRequest) {
    data = normalizeGraphQLResponse(data, graphqlRequest.operationName);
  } else if (
    preparedRequest.processedRequest.rawResponse &&
    response.status === 200 &&
    preparedRequest.processedRequest.responseType !== 'blob'
  ) {
    data = {
      status: 0,
      msg: '',
      data,
    };
  }

  let normalizedResponse: AmisFetcherResult = {
    status: response.status,
    headers: responseHeaders,
    data,
  };

  if (preparedRequest.processedRequest.responseType === 'blob') {
    normalizedResponse = await normalizeBlobResponse(normalizedResponse);
    data = normalizedResponse.data;
  }

  if ((response.status < 200 || response.status >= 300) && !isApiPayload(data)) {
    data = {
      status: -1,
      msg: normalizeErrMessage(response.status, getErrorMessages().apiRequestFailed),
    };
  }

  if (isApiPayload(data)) {
    const payloadStatus = Number(data.status ?? -1);

    if (
      (payloadStatus === 0 || payloadStatus === 200) &&
      preparedRequest.processedRequest.responseKey
    ) {
      data = {
        [preparedRequest.processedRequest.responseKey]: data.data,
      };
    }
  }

  return {
    ...normalizedResponse,
    data,
  };
}

export async function fetchAmisRequest(options: AmisRequestOptions): Promise<AmisFetcherResult> {
  const adapter = getAmisRuntimeAdapter();

  const task = (async () => {
    const specialResult = await handleSpecialRequest(options);
    const result = specialResult ?? (await executeNetworkRequest(options));
    notifyResult(options, result);
    return result;
  })();

  return adapter.processResponse ? adapter.processResponse(task) : task;
}
