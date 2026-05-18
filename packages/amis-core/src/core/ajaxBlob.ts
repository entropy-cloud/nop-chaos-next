import type { AmisFetcherResult } from '../types';
import { getErrorMessages } from './ajaxMessages';

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
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

export async function normalizeBlobResponse(response: AmisFetcherResult) {
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
