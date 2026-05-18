import { getAmisRuntimeAdapter } from '../adapter';
import type { AmisFetcherResult } from '../types';

type HttpErrorMessages = Partial<
  Record<401 | 403 | 404 | 405 | 408 | 500 | 501 | 502 | 503 | 504 | 505, string>
>;

export function normalizeMessage(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return 'Unknown amis runtime message';
}

export function buildSuccessResponse(data: unknown): AmisFetcherResult {
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

export function getErrorMessages() {
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

export function normalizeErrMessage(status: number, fallback = '') {
  return getErrorMessages().statusMessages[status as keyof HttpErrorMessages] || fallback;
}

export async function normalizeNetworkError(error: unknown): Promise<AmisFetcherResult> {
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
