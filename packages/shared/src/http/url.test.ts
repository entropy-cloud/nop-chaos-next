import { describe, expect, it, vi } from 'vitest';
import {
  appendQueryParams,
  hasProtocolPath,
  isAbsoluteUrl,
  isProtocolRelativePath,
  isRelativeOrRootPath,
  normalizeRequestUrl,
  resolveRequestUrl,
  resolveSameOriginPath,
} from './url';

describe('url helpers', () => {
  it('detects protocol and protocol-relative paths', () => {
    expect(hasProtocolPath('https://example.com/a.js')).toBe(true);
    expect(hasProtocolPath('data:text/plain,hello')).toBe(true);
    expect(hasProtocolPath('/plugins/a.js')).toBe(false);
    expect(isProtocolRelativePath('//example.com/a.js')).toBe(true);
    expect(isProtocolRelativePath('/plugins/a.js')).toBe(false);
  });

  it('accepts only relative or root paths', () => {
    expect(isRelativeOrRootPath('./demo/index.ts')).toBe(true);
    expect(isRelativeOrRootPath('/plugins/plugin-demo.system.js')).toBe(true);
    expect(isRelativeOrRootPath('https://example.com/demo.js')).toBe(false);
    expect(isRelativeOrRootPath('//example.com/demo.js')).toBe(false);
  });

  it('resolves same-origin relative paths', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://example.com' },
    });

    expect(resolveSameOriginPath('/plugins/demo.js').href).toBe('https://example.com/plugins/demo.js');
    expect(resolveSameOriginPath('./actions.js', 'https://example.com/schema/page.json').href).toBe(
      'https://example.com/schema/actions.js',
    );
  });

  it('rejects protocol-based paths', () => {
    expect(() => resolveSameOriginPath('https://example.com/demo.js')).toThrow(
      'Only relative same-origin paths are allowed: https://example.com/demo.js',
    );
    expect(() => resolveSameOriginPath('data:text/javascript,export default {}')).toThrow(
      'Only relative same-origin paths are allowed: data:text/javascript,export default {}',
    );
  });

  describe('isAbsoluteUrl', () => {
    it('detects http/https urls', () => {
      expect(isAbsoluteUrl('http://example.com/a.js')).toBe(true);
      expect(isAbsoluteUrl('https://example.com/a.js')).toBe(true);
      expect(isAbsoluteUrl('/plugins/a.js')).toBe(false);
      expect(isAbsoluteUrl('//example.com/a.js')).toBe(false);
    });
  });

  describe('appendQueryParams', () => {
    it('appends query params to a URL', () => {
      const url = new URL('https://example.com/api');
      appendQueryParams(url, { page: '1', limit: '10' });

      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('limit')).toBe('10');
    });

    it('skips null and undefined values', () => {
      const url = new URL('https://example.com/api');
      appendQueryParams(url, { page: '1', skip: null, maybe: undefined });

      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.has('skip')).toBe(false);
      expect(url.searchParams.has('maybe')).toBe(false);
    });

    it('appends array values as repeated params', () => {
      const url = new URL('https://example.com/api');
      appendQueryParams(url, { ids: ['a', 'b', 'c'] });

      expect(url.searchParams.getAll('ids')).toEqual(['a', 'b', 'c']);
    });

    it('returns the same URL instance', () => {
      const url = new URL('https://example.com/api');
      expect(appendQueryParams(url, { key: 'val' })).toBe(url);
    });

    it('returns the URL unchanged when query is undefined', () => {
      const url = new URL('https://example.com/api');
      expect(appendQueryParams(url, undefined)).toBe(url);
    });
  });

  describe('normalizeRequestUrl', () => {
    it('returns absolute URL unchanged as string', () => {
      expect(normalizeRequestUrl('https://example.com/api')).toBe('https://example.com/api');
    });

    it('returns relative URL path + search + hash', () => {
      const result = normalizeRequestUrl('/api/users?page=1#top');
      expect(result).toMatch(/^\/api\/users\?page=1#top$/);
    });

    it('appends query params to relative url', () => {
      const result = normalizeRequestUrl('/api/users', { limit: '20' });
      expect(result).toMatch(/^\/api\/users\?limit=20$/);
    });

    it('overwrites existing search params with query object', () => {
      const result = normalizeRequestUrl('/api/users?page=1', { page: '2' });
      expect(result).toMatch(/^\/api\/users\?page=2$/);
    });
  });

  describe('resolveRequestUrl', () => {
    it('returns normalized absolute URL without baseUrl prefix', () => {
      expect(resolveRequestUrl('https://api.example.com/data', undefined, '/base')).toBe(
        'https://api.example.com/data',
      );
    });

    it('prefixes baseUrl when normalized url is relative and baseUrl is set', () => {
      expect(resolveRequestUrl('/api/users', undefined, 'https://host.example.com')).toBe(
        'https://host.example.com/api/users',
      );
    });

    it('adds leading slash when normalized path does not start with /', () => {
      expect(resolveRequestUrl('api/users', undefined, 'https://host.example.com')).toBe(
        'https://host.example.com/api/users',
      );
    });

    it('returns normalized url when no baseUrl', () => {
      expect(resolveRequestUrl('/api/users', undefined, '')).toBe('/api/users');
    });
  });
});
