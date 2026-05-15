// @vitest-environment happy-dom
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('shows a status banner after the browser goes offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });

    const testI18n = i18next.createInstance();
    await testI18n.init({
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: {
        'en-US': {
          translation: {
            common: {
              offline: 'offline banner',
            },
          },
        },
      },
    });

    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
      <I18nextProvider i18n={testI18n}>
        <OfflineBanner />
      </I18nextProvider>,
    );

    await vi.waitFor(() => {
      expect(document.getElementById('root')?.textContent ?? '').toBe('');
    });

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event('offline'));

    await vi.waitFor(() => {
      expect(document.getElementById('root')?.textContent).toContain('offline banner');
    });
  });
});
