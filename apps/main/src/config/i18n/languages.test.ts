import { describe, expect, it } from 'vitest';
import {
  getLanguageOptions,
  normalizeLanguageCode,
  registerLanguages,
  replaceLanguages,
  getDefaultLanguage,
  setDefaultLanguage,
} from './languages';

describe('i18n language config', () => {
  it('normalizes short language codes to the supported locale codes', () => {
    expect(normalizeLanguageCode(undefined)).toBe('zh-CN');
    expect(normalizeLanguageCode('en')).toBe('en-US');
    expect(normalizeLanguageCode('en_US')).toBe('en-US');
    expect(normalizeLanguageCode('zh')).toBe('zh-CN');
    expect(normalizeLanguageCode('ja-JP')).toBe('ja-JP');
  });

  it('normalizes null to zh-CN', () => {
    expect(normalizeLanguageCode(null)).toBe('zh-CN');
  });

  it('normalizes empty string to zh-CN', () => {
    expect(normalizeLanguageCode('')).toBe('zh-CN');
  });

  it('exposes English as en-US in the language registry', () => {
    expect(getLanguageOptions().some((item) => item.code === 'en-US')).toBe(true);
  });

  it('registerLanguages appends new languages', () => {
    registerLanguages([{ code: 'ja-JP', labelKey: 'settings.languageOptions.ja' }]);
    const options = getLanguageOptions();
    expect(options.some((item) => item.code === 'ja-JP')).toBe(true);
  });

  it('registerLanguages updates existing language by code', () => {
    registerLanguages([{ code: 'en-US', labelKey: 'updated.label' }]);
    const en = getLanguageOptions().find((item) => item.code === 'en-US');
    expect(en!.labelKey).toBe('updated.label');
  });

  it('replaceLanguages replaces all options', () => {
    replaceLanguages([{ code: 'fr-FR', labelKey: 'settings.languageOptions.fr' }]);
    const options = getLanguageOptions();
    expect(options).toHaveLength(1);
    expect(options[0].code).toBe('fr-FR');
  });

  it('getDefaultLanguage returns zh-CN', () => {
    expect(getDefaultLanguage()).toBe('zh-CN');
  });

  it('setDefaultLanguage changes the default', () => {
    setDefaultLanguage('en-US');
    expect(getDefaultLanguage()).toBe('en-US');
    setDefaultLanguage('zh-CN');
    expect(getDefaultLanguage()).toBe('zh-CN');
  });
});
