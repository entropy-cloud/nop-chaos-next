export function getBaseOrigin() {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}

export function hasProtocolPath(path: string) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
}

export function isProtocolRelativePath(path: string) {
  return path.startsWith('//');
}

export function isRelativeOrRootPath(path: string) {
  return Boolean(path) && !hasProtocolPath(path) && !isProtocolRelativePath(path);
}

export function resolveSameOriginPath(path: string, baseUrl = getBaseOrigin()) {
  if (!isRelativeOrRootPath(path)) {
    throw new Error(`Only relative same-origin paths are allowed: ${path}`);
  }

  const resolved = new URL(path, baseUrl);

  if (resolved.origin !== getBaseOrigin()) {
    throw new Error(`Only same-origin paths are allowed: ${path}`);
  }

  return resolved;
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
