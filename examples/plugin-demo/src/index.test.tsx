import { describe, expect, it } from 'vitest';
import enUS from '../public/locales/en-US/translation.json';
import zhCN from '../public/locales/zh-CN/translation.json';

function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

describe('plugin-demo i18n contract', () => {
  it('ships translated content for the remote plugin shell', () => {
    const requiredKeys = [
      'plugins.title',
      'plugins.managementTitle',
      'plugins.remotePluginEyebrow',
      'plugins.bridgeDescription',
      'plugins.weekdays.mon',
      'plugins.weekdays.sun',
      'common.guest',
      'common.enabledLowercase',
      'common.disabledLowercase',
    ];

    for (const locale of [enUS, zhCN]) {
      for (const key of requiredKeys) {
        expect(getByPath(locale, key)).toEqual(expect.any(String));
      }
    }
  });
});
