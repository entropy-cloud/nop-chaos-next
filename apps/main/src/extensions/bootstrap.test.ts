// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerLanguagesMock = vi.fn();
const resetLanguagesMock = vi.fn();
const setDefaultLanguageMock = vi.fn();
const registerThemesMock = vi.fn();
const registerHostSharedModulesMock = vi.fn();
const registerBuiltinPagesMock = vi.fn();
const setPluginsMock = vi.fn();
const getPluginsStateMock = vi.fn(() => []);
const setLoadedExtensionsMock = vi.fn();
const setShellRuntimeConfigMock = vi.fn();

vi.mock('../config/i18n/languages', () => ({
  registerLanguages: (...args: unknown[]) => registerLanguagesMock(...args),
  resetLanguages: () => resetLanguagesMock(),
  setDefaultLanguage: (...args: unknown[]) => setDefaultLanguageMock(...args),
}));

vi.mock('../config/themeRegistry', () => ({
  registerThemes: (...args: unknown[]) => registerThemesMock(...args),
}));

vi.mock('../plugins/sharedModules', () => ({
  registerHostSharedModules: () => registerHostSharedModulesMock(),
}));

vi.mock('../router/pageRegistry', () => ({
  registerBuiltinPages: (...args: unknown[]) => registerBuiltinPagesMock(...args),
}));

vi.mock('../store/pluginStore', async () => {
  const actual = await vi.importActual<typeof import('../store/pluginStore')>('../store/pluginStore');
  return {
    ...actual,
    usePluginStore: {
      getState: () => ({
        plugins: getPluginsStateMock(),
        setPlugins: setPluginsMock,
      }),
    },
  };
});

vi.mock('@nop-chaos/extension-host', () => ({
  loadExtensions: vi.fn(),
  resolveShellRuntimeConfig: vi.fn(() => ({
    branding: { name: 'Test', shortName: 'T', documentTitle: 'Test' },
    loginUi: { features: [] },
    shell: {},
    systemPages: {},
  })),
  setLoadedExtensions: (...args: unknown[]) => setLoadedExtensionsMock(...args),
  setShellRuntimeConfig: (...args: unknown[]) => setShellRuntimeConfigMock(...args),
}));

vi.mock('../config/i18n', () => ({
  default: { addResourceBundle: vi.fn() },
  initializeI18n: vi.fn(async () => undefined),
}));

vi.mock('../services/http', () => ({
  mainHttpClient: { request: vi.fn() },
}));

vi.mock('./config', () => ({
  getExtensionSources: () => [{ id: 'extension-a', load: async () => ({}) }],
}));

describe('bootstrapExtensions extension contract', () => {
  beforeEach(() => {
    registerLanguagesMock.mockReset();
    resetLanguagesMock.mockReset();
    setDefaultLanguageMock.mockReset();
    registerThemesMock.mockReset();
    registerHostSharedModulesMock.mockReset();
    registerBuiltinPagesMock.mockReset();
    setPluginsMock.mockReset();
    getPluginsStateMock.mockReset();
    getPluginsStateMock.mockReturnValue([]);
    setLoadedExtensionsMock.mockReset();
    setShellRuntimeConfigMock.mockReset();
  });

  it('merges supported languages and extension plugins during bootstrap', async () => {
    const pluginA = {
      id: 'plugin-a',
      name: 'Plugin A',
      icon: 'puzzle',
      description: 'A',
      version: '1.0.0',
      author: 'test',
      source: 'ext',
      enabled: true,
      url: '/plugin-a.js',
      updatedAt: '2026-05-18',
    };
    const pluginB = {
      id: 'plugin-b',
      name: 'Plugin B',
      icon: 'puzzle',
      description: 'B',
      version: '1.0.0',
      author: 'test',
      source: 'ext',
      enabled: true,
      url: '/plugin-b.js',
      updatedAt: '2026-05-18',
    };

    const { loadExtensions } = await import('@nop-chaos/extension-host');
    vi.mocked(loadExtensions).mockResolvedValue([
      {
        source: { id: 'one', load: async () => ({}) },
        extension: {
          id: 'one',
          supportedLanguages: [{ code: 'fr-FR', labelKey: 'settings.languageOptions.frFR' }],
          plugins: [pluginA],
        },
      },
      {
        source: { id: 'two', load: async () => ({}) },
        extension: {
          id: 'two',
          supportedLanguages: [{ code: 'ja-JP', labelKey: 'settings.languageOptions.ja' }],
          plugins: [pluginB],
        },
      },
    ]);

    const { bootstrapExtensions } = await import('./bootstrap');
    await bootstrapExtensions();

    expect(resetLanguagesMock).toHaveBeenCalledTimes(1);
    expect(registerLanguagesMock).toHaveBeenCalledWith([
      { code: 'fr-FR', labelKey: 'settings.languageOptions.frFR' },
    ]);
    expect(registerLanguagesMock).toHaveBeenCalledWith([
      { code: 'ja-JP', labelKey: 'settings.languageOptions.ja' },
    ]);
    expect(setPluginsMock).toHaveBeenCalledWith([pluginA, pluginB]);
  });
});
