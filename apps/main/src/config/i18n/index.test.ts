import { beforeEach, describe, expect, it, vi } from 'vitest';

const initMock = vi.fn();
const useMock = vi.fn();

vi.mock('i18next', () => ({
  default: {
    use: useMock,
    init: initMock,
  },
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: function LanguageDetector() {},
}));

vi.mock('i18next-http-backend', () => ({
  default: function HttpBackend() {},
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {},
}));

describe('initializeI18n', () => {
  beforeEach(() => {
    vi.resetModules();
    initMock.mockReset();
    useMock.mockReset();
    useMock.mockReturnThis();
    initMock.mockResolvedValue(undefined);
  });

  it('initializes i18n only once and reuses the same promise', async () => {
    const { initializeI18n } = await import('./index');

    const first = initializeI18n();
    const second = initializeI18n();

    expect(first).toBe(second);

    await first;

    expect(useMock).toHaveBeenCalledTimes(3);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLng: 'zh-CN',
        supportedLngs: ['zh-CN', 'en-US'],
        backend: expect.objectContaining({
          loadPath: '/locales/{{lng}}/translation.json',
        }),
      }),
    );
  });
});
