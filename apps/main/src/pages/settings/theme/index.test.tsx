// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsThemePage from './index';

const setThemeIdMock = vi.fn();
const setDisplayModeMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../components/common/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    themeConfig: { themeId: 'classic', displayMode: 'light' },
    setThemeId: setThemeIdMock,
    setDisplayMode: setDisplayModeMock,
  }),
}));

describe('SettingsThemePage', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    setThemeIdMock.mockReset();
    setDisplayModeMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('uses toggle controls for theme selection and updates the theme id on click', () => {
    act(() => {
      root.render(<SettingsThemePage />);
    });

    const classicToggle = container.querySelector(
      '[aria-label="settings.themeOptions.classic.label"]',
    ) as HTMLButtonElement | null;
    const glassToggle = container.querySelector(
      '[aria-label="settings.themeOptions.glass.label"]',
    ) as HTMLButtonElement | null;

    expect(classicToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(glassToggle?.getAttribute('aria-pressed')).toBe('false');

    act(() => {
      glassToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setThemeIdMock).toHaveBeenCalledWith('glass');
  });
});
