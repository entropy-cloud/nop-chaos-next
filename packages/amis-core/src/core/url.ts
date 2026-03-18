export type ParsedPrefixUrl = [type: string, path: string]

export function splitPrefixUrl(url: string): ParsedPrefixUrl | undefined {
  if (url.startsWith('@')) {
    const separatorIndex = url.indexOf(':')

    if (separatorIndex < 0) {
      return undefined
    }

    return [url.slice(1, separatorIndex), url.slice(separatorIndex + 1).trim()]
  }

  const separatorIndex = url.indexOf('://')

  if (separatorIndex < 0) {
    return undefined
  }

  return [url.slice(0, separatorIndex), url.slice(separatorIndex + 3)]
}

export function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url)
}
