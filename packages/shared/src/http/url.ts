export function getBaseOrigin() {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}

export function isAbsoluteUrl(url: string) {
  return /^https?:\/\//.test(url);
}

export function appendQueryParams(url: URL, query?: Record<string, unknown>) {
  if (!query) {
    return url;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }

      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

export function normalizeRequestUrl(url: string, query?: Record<string, unknown>) {
  const nextUrl = appendQueryParams(
    new URL(url, isAbsoluteUrl(url) ? undefined : getBaseOrigin()),
    query,
  );

  if (isAbsoluteUrl(url)) {
    return nextUrl.toString();
  }

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export function resolveRequestUrl(
  url: string,
  query: Record<string, unknown> | undefined,
  baseUrl: string,
) {
  const normalizedUrl = normalizeRequestUrl(url, query);

  if (!baseUrl || isAbsoluteUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  return `${baseUrl}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
}
