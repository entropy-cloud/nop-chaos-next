import { describe, expect, it } from 'vitest';
import extension from './index';
import enUS from '../public/locales/en-US/translation.json';
import frFR from '../public/locales/fr-FR/translation.json';

function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

describe('extension-demo i18n contract', () => {
  it('declares locale assets for every supported language', () => {
    expect(extension.i18n?.languages).toEqual(['en-US', 'fr-FR']);
  });

  it('resolves menu and settings keys from every shipped locale', () => {
    const requiredKeys = [
      'extensionDemo.builtin.title',
      'settings.languageOptions.en',
      'settings.languageOptions.frFR',
      'settings.themeOptions.harbor.label',
      'settings.themeOptions.harbor.description',
    ];

    for (const locale of [enUS, frFR]) {
      for (const key of requiredKeys) {
        expect(getByPath(locale, key)).toEqual(expect.any(String));
      }
    }
  });

  it('ships translated content for extension-owned builtin and system pages', () => {
    const requiredKeys = [
      'extensionDemo.login.heroEyebrow',
      'extensionDemo.login.signInTitle',
      'extensionDemo.login.demoCredentials',
      'extensionDemo.login.overrideFeatures.sharedRuntime.description',
      'extensionDemo.builtinPage.howItWorks.title',
      'extensionDemo.builtinPage.sharedStack.items.hostRegistration',
      'extensionDemo.notFound.title',
      'extensionDemo.notFound.quickLinks.home.description',
      'extensionDemo.notFound.returnToWorkspace',
    ];

    for (const locale of [enUS, frFR]) {
      for (const key of requiredKeys) {
        expect(getByPath(locale, key)).toEqual(expect.any(String));
      }
    }
  });
});
