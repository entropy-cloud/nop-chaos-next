import { getAmisRuntimeAdapter } from '../adapter';
import { bindActions } from '../page/action';
import { transformPageJson } from '../page/transform';
import type { AmisFetcherResult, AmisRequestOptions } from '../types';
import { createHttpClient, isApiPayload } from '@nop-chaos/shared';
import type { HttpRequestOptions } from '@nop-chaos/shared';
import { normalizeGraphQLResponse, transformGraphQLRequest } from './graphql';
import { splitPrefixUrl } from './url';

type HttpErrorMessages = Partial<
  Record<401 | 403 | 404 | 405 | 408 | 500 | 501 | 502 | 503 | 504 | 505, string>
>;

function normalizeMessage(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return 'Unknown amis runtime message';
}

function getApiBaseUrl() {
  if (import.meta.env?.VITE_USE_API_PROXY === 'true') {
    return '';
  }

  return import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

function buildSuccessResponse(data: unknown): AmisFetcherResult {
  return {
    status: 200,
    data: {
      status: 0,
      msg: '',
      data,
    },
    headers: {},
  };
}

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function getErrorMessages() {
  const t = getAmisRuntimeAdapter().getI18n().t.bind(getAmisRuntimeAdapter().getI18n());

  const messages: HttpErrorMessages = {
    401: t('sys.api.errMsg401', { defaultValue: 'Authentication required' }),
    403: t('sys.api.errMsg403', { defaultValue: 'Access denied' }),
    404: t('sys.api.errMsg404', { defaultValue: 'Resource not found' }),
    405: t('sys.api.errMsg405', { defaultValue: 'Method not allowed' }),
    408: t('sys.api.errMsg408', { defaultValue: 'Request timeout' }),
    500: t('sys.api.errMsg500', { defaultValue: 'Internal server error' }),
    501: t('sys.api.errMsg501', { defaultValue: 'Not implemented' }),
    502: t('sys.api.errMsg502', { defaultValue: 'Bad gateway' }),
    503: t('sys.api.errMsg503', { defaultValue: 'Service unavailable' }),
    504: t('sys.api.errMsg504', { defaultValue: 'Gateway timeout' }),
    505: t('sys.api.errMsg505', { defaultValue: 'HTTP version not supported' }),
  };

  return {
    apiRequestFailed: t('sys.api.apiRequestFailed', {
      defaultValue: 'The request failed, please try again later',
    }),
    networkExceptionMsg: t('sys.api.networkExceptionMsg', {
      defaultValue: 'Network exception, please check your connection',
    }),
    downloading: t('sys.api.downloading', { defaultValue: 'Downloading attachment' }),
    statusMessages: messages,
  };
}

function normalizeErrMessage(status: number, fallback = '') {
  return getErrorMessages().statusMessages[status as keyof HttpErrorMessages] || fallback;
}

function parseContentDispositionFilename(disposition: string) {
  const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  const matches = disposition.match(filenameRegex);

  if (!matches?.length) {
    return '';
  }

  let filename = matches[1].replace(`UTF-8''`, '').replace(/['"]/g, '');

  if (filename && filename.replace(/[^%]/g, '').length > 2) {
    filename = decodeURIComponent(filename);
  }

  return filename;
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const navigatorWithSave = window.navigator as Navigator & {
    msSaveBlob?: (blobValue: Blob, fileName?: string) => void;
  };

  if (typeof navigatorWithSave.msSaveBlob !== 'undefined') {
    navigatorWithSave.msSaveBlob(blob, filename);
    return;
  }

  const URLFactory =
    window.URL || (window as unknown as { webkitURL?: typeof window.URL }).webkitURL;

  if (!URLFactory) {
    return;
  }

  const downloadUrl = URLFactory.createObjectURL(blob);

  if (filename) {
    const anchor = document.createElement('a');

    if (typeof anchor.download === 'undefined') {
      window.location.assign(downloadUrl);
    } else {
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  } else {
    window.location.assign(downloadUrl);
  }

  window.setTimeout(() => {
    URLFactory.revokeObjectURL(downloadUrl);
  }, 100);
}

async function normalizeBlobResponse(response: AmisFetcherResult) {
  if (!isBlobLike(response.data)) {
    return response;
  }

  const contentDisposition = response.headers?.['content-disposition'];
  const contentType = response.headers?.['content-type'] || '';

  if (contentDisposition?.includes('attachment')) {
    const filename = parseContentDispositionFilename(contentDisposition);
    downloadBlob(response.data, filename);

    return {
      ...response,
      data: {
        status: 0,
        msg: getErrorMessages().downloading,
      },
    };
  }

  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    const text = await response.data.text();
    return {
      ...response,
      data: JSON.parse(text) as unknown,
    };
  }

  return response;
}

async function normalizeNetworkError(error: unknown): Promise<AmisFetcherResult> {
  const messageCatalog = getErrorMessages();

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw error;
  }

  if (error instanceof Error) {
    const message = error.message.includes('Failed to fetch')
      ? messageCatalog.networkExceptionMsg
      : messageCatalog.apiRequestFailed;
    return {
      status: 0,
      data: {
        status: -1,
        msg: message,
      },
      headers: {},
    };
  }

  return {
    status: 0,
    data: {
      status: -1,
      msg: messageCatalog.apiRequestFailed,
    },
    headers: {},
  };
}

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

async function handleSpecialRequest(
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
    const boundSchema = options._page
      ? await bindActions(transformedSchema, options._page)
      : transformedSchema;
    return buildSuccessResponse(boundSchema);
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createAbortSignal(cancelExecutor: AmisRequestOptions['cancelExecutor']) {
  if (!cancelExecutor) {
    return undefined;
  }

  const controller = new AbortController();
  cancelExecutor(() => {
    controller.abort();
  });
  return controller.signal;
}

let _client: ReturnType<typeof createHttpClient> | null = null;
let _clientAdapter: ReturnType<typeof getAmisRuntimeAdapter> | null = null;

function getClient() {
  const adapter = getAmisRuntimeAdapter();

  if (!_client || _clientAdapter !== adapter) {
    _clientAdapter = adapter;

    _client = createHttpClient({
      getBaseUrl: getApiBaseUrl,
      getLocale: () => adapter.getLocale()?.replace('_', '-') || 'zh-CN',
      getAuthToken: () => adapter.getAuthToken(),
      getRefreshToken: () => adapter.getRefreshToken?.(),
      setAuthToken: (token) => {
        if (token) {
          adapter.setAuthToken(token);
        }
      },
      clearTokens: () => {
        adapter.clearTokens?.();
      },
      refreshAccessToken: adapter.refreshAccessToken,
      onUnauthorized: () => {
        adapter.logout('401');
      },
    });
  }

  return _client;
}

async function executeSharedRequest(options: HttpRequestOptions) {
  const adapter = getAmisRuntimeAdapter();

  if (adapter.request) {
    return adapter.request(options);
  }

  return getClient().request(options);
}

async function executeNetworkRequest(options: AmisRequestOptions): Promise<AmisFetcherResult> {
  const adapter = getAmisRuntimeAdapter();
  const graphqlRequest = transformGraphQLRequest(options);
  const preparedRequest = graphqlRequest?.request ?? options;
  const processedRequest = adapter.processRequest
    ? adapter.processRequest(preparedRequest)
    : preparedRequest;
  const method = processedRequest.method ?? (processedRequest.data === undefined ? 'GET' : 'POST');
  const normalizedMethod = method.toUpperCase();
  const requestData = normalizedMethod === 'GET' ? undefined : processedRequest.data;
  const requestQuery =
    normalizedMethod === 'GET'
      ? {
          ...processedRequest.query,
          ...(isPlainObject(processedRequest.data) ? processedRequest.data : {}),
        }
      : processedRequest.query;
  let response: Awaited<ReturnType<typeof executeSharedRequest>>;

  try {
    response = await executeSharedRequest({
      method,
      url: processedRequest.url,
      query: requestQuery,
      data: requestData,
      headers: processedRequest.headers,
      withAuth: processedRequest.withToken,
      responseType: processedRequest.responseType,
      signal: createAbortSignal(processedRequest.cancelExecutor),
    });
  } catch (error) {
    return normalizeNetworkError(error);
  }

  const responseHeaders = response.headers;
  let data = response.data;

  if (graphqlRequest) {
    data = normalizeGraphQLResponse(data, graphqlRequest.operationName);
  } else if (
    processedRequest.rawResponse &&
    response.status === 200 &&
    processedRequest.responseType !== 'blob'
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

  if (processedRequest.responseType === 'blob') {
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

    if ((payloadStatus === 0 || payloadStatus === 200) && processedRequest.responseKey) {
      data = {
        [processedRequest.responseKey]: data.data,
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
