import { describe, expect, it } from 'vitest';
import { getLanguageOptions, normalizeLanguageCode } from './languages';

describe('i18n language config', () => {
  it('normalizes short language codes to the supported locale codes', () => {
    expect(normalizeLanguageCode(undefined)).toBe('zh-CN');
    expect(normalizeLanguageCode('en')).toBe('en-US');
    expect(normalizeLanguageCode('en_US')).toBe('en-US');
    expect(normalizeLanguageCode('zh')).toBe('zh-CN');
    expect(normalizeLanguageCode('ja-JP')).toBe('ja-JP');
  });

  it('exposes English as en-US in the language registry', () => {
    expect(getLanguageOptions().some((item) => item.code === 'en-US')).toBe(true);
  });
});
