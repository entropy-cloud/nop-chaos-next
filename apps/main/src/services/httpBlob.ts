const REVOKE_DELAY_MS = 40_000;

function extractFilename(contentDisposition: string | undefined): string | undefined {
  if (!contentDisposition) return undefined;

  const rfc5987 = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i.exec(contentDisposition);
  if (rfc5987?.[1]) {
    try {
      return decodeURIComponent(rfc5987[1].trim());
    } catch {
      return rfc5987[1].trim();
    }
  }

  const plain = /filename\*?\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain?.[1]?.trim();
}

function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export interface NormalizeBlobOptions {
  downloadFileName?: string;
  headers?: Record<string, string>;
}

export async function normalizeBlobData(blob: Blob, options: NormalizeBlobOptions): Promise<unknown> {
  const contentType = blob.type || options.headers?.['content-type'] || '';

  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    try {
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      // fall through to download path
    }
  }

  const filename = options.downloadFileName ?? extractFilename(options.headers?.['content-disposition']);

  if (filename) {
    triggerDownload(blob, filename);
    return { status: 0, msg: 'downloading' };
  }

  return blob;
}
