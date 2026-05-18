import { describe, expect, it, vi } from 'vitest';
import {
  hasProtocolPath,
  isProtocolRelativePath,
  isRelativeOrRootPath,
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
});
