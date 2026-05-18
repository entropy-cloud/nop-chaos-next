import type { HttpRequestOptions, HttpResponse, HttpRuntime } from './types';
import { getRefreshPromise, setRefreshPromise } from '../auth/tokenManager';
import { resolveRequestUrl } from './url';

const DEFAULT_APP_ID = 'nop-chaos';
const DEFAULT_TIMEOUT_MS = 15_000;

type HttpStatusError = Error & { status?: number };

function createTimeoutError(timeoutMs: number) {
  return new Error(`Request timed out after ${timeoutMs}ms`);
}

function createHttpStatusError(status: number, message: string): HttpStatusError {
  const error = new Error(message) as HttpStatusError;
  error.status = status;
  return error;
}

function createAbortSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(createTimeoutError(timeoutMs)),
    timeoutMs,
  );

  const abortFromParent = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      abortFromParent();
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromParent);
    },
  };
}

function normalizeHeaders(headers: Headers) {
  const normalizedHeaders: Record<string, string> = {};

  headers.forEach((value, key) => {
    normalizedHeaders[key.toLowerCase()] = value;
  });

  return normalizedHeaders;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeRequestBody(data: unknown, headers: Headers) {
  if (data == null) {
    return undefined;
  }

  if (
    typeof data === 'string' ||
    data instanceof FormData ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof URLSearchParams
  ) {
    return data as BodyInit;
  }

  if (
    isPlainObject(data) ||
    Array.isArray(data) ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
    return JSON.stringify(data);
  }

  return data as BodyInit;
}

async function parseJsonOrText(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function parseResponseBody(
  response: Response,
  responseType: HttpRequestOptions['responseType'],
) {
  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text();
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return text ? (JSON.parse(text) as unknown) : null;
  }

  return parseJsonOrText(text);
}

export function createHttpClient(runtime: HttpRuntime) {
  async function getValidToken(): Promise<string | undefined> {
    if (runtime.getValidToken) {
      return runtime.getValidToken();
    }
    return runtime.getAuthToken();
  }

  async function doRefreshToken(): Promise<string> {
    const activeRefresh = getRefreshPromise();

    if (activeRefresh) {
      return activeRefresh;
    }

    if (runtime.refreshAccessToken) {
      const nextRefreshPromise = runtime.refreshAccessToken().finally(() => {
        setRefreshPromise(null);
      });

      setRefreshPromise(nextRefreshPromise);
      return nextRefreshPromise;
    }

    throw new Error('Token refresh not available');
  }

  async function doRequest<T>(
    options: HttpRequestOptions,
    token?: string,
  ): Promise<HttpResponse<T>> {
    const headers = new Headers({
      Accept: 'application/json',
      'nop-locale': runtime.getLocale(),
      'x-requested-with': 'XMLHttpRequest',
      ...options.headers,
    });

    if (options.withAuth !== false && token) {
      headers.set('x-access-token', token);
      headers.set('authorization', `Bearer ${token}`);
      headers.set('x-timestamp', String(Date.now()));
      headers.set('x-tenant-id', headers.get('x-tenant-id') ?? '0');
      headers.set('x-version', headers.get('x-version') ?? 'v3');
      headers.set('nop-app-id', headers.get('nop-app-id') ?? DEFAULT_APP_ID);
    }

    const method = options.method ?? (options.data === undefined ? 'GET' : 'POST');
    const timeoutMs = options.timeoutMs ?? runtime.getTimeoutMs?.() ?? DEFAULT_TIMEOUT_MS;
    const { signal, cleanup } = createAbortSignal(options.signal, timeoutMs);
    let response: Response;

    try {
      response = await fetch(resolveRequestUrl(options.url, options.query, runtime.getBaseUrl()), {
        method,
        headers,
        signal,
        body:
          method.toUpperCase() === 'GET' ? undefined : serializeRequestBody(options.data, headers),
      });
    } catch (error: unknown) {
      cleanup();

      if (error instanceof Error && error.name === 'AbortError') {
        throw error.cause instanceof Error ? error.cause : createTimeoutError(timeoutMs);
      }

      throw new Error(
        `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    cleanup();

    const responseToken = response.headers.get('x-access-token');
    if (responseToken) {
      runtime.setAuthToken?.(responseToken);
    }

    return {
      status: response.status,
      headers: normalizeHeaders(response.headers),
      data: (await parseResponseBody(response, options.responseType)) as T,
    };
  }

  return {
    async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
      const failUnauthorized = (message = 'Authentication required'): never => {
        runtime.clearTokens?.();
        runtime.onUnauthorized?.();
        throw createHttpStatusError(401, message);
      };

      const token = options.withAuth === false ? runtime.getAuthToken() : await getValidToken();
      let response = await doRequest<T>(options, token);

      if (response.status === 401 && options.withAuth !== false) {
        const refreshToken = runtime.getRefreshToken?.();
        if (refreshToken) {
          try {
            const newToken = await doRefreshToken();
            response = await doRequest<T>(options, newToken);
          } catch (error: unknown) {
            failUnauthorized(
              `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }

          if (response.status === 401) {
            failUnauthorized();
          }

          return response;
        }

        failUnauthorized();
      }

      return response;
    },
  };
}
