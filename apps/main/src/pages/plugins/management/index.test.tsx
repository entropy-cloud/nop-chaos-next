// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginManifest } from '@nop-chaos/shared';

import PluginsManagementPage from './index';

const updatePluginMock = vi.fn();

const plugins: PluginManifest[] = [
  {
    id: 'plugin-demo',
    name: 'Plugin Demo',
    icon: 'puzzle',
    description: 'Demo plugin',
    version: '1.0.0',
    author: 'NOP',
    source: 'extension',
    enabled: true,
    url: '/plugins/plugin-demo.system.js',
    updatedAt: '2026-05-17',
    configSchema: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: ['simple', 'advanced'],
        defaultValue: 'simple',
      },
    ],
    settings: { mode: 'simple' },
  },
];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => `${key}${options?.name ? `:${String(options.name)}` : ''}` }),
}));

vi.mock('../../../components/common/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../../../services/confirm', () => ({
  confirmInApp: vi.fn(async () => true),
}));

vi.mock('../../../store/pluginStore', () => ({
  usePluginStore: (selector: (state: { plugins: PluginManifest[]; updatePlugin: typeof updatePluginMock }) => unknown) =>
    selector({ plugins, updatePlugin: updatePluginMock }),
}));

describe('PluginsManagementPage', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    updatePluginMock.mockReset();
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

  it('uses toggle chips for select config options and updates plugin settings on click', () => {
    act(() => {
      root.render(<PluginsManagementPage />);
    });

    const configureButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('plugins.configureAction'),
    );

    act(() => {
      configureButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const dialogContent = Array.from(document.body.querySelectorAll('[role="dialog"]')).at(-1) ?? document.body;

    const simpleToggle = dialogContent.querySelector('[aria-label="Mode: simple"]') as HTMLButtonElement | null;
    const advancedToggle = dialogContent.querySelector('[aria-label="Mode: advanced"]') as HTMLButtonElement | null;

    expect(simpleToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(advancedToggle?.getAttribute('aria-pressed')).toBe('false');

    act(() => {
      advancedToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(updatePluginMock).toHaveBeenCalledWith('plugin-demo', expect.any(Function));
  });

  it('renders extension-provided plugin manifests in the management list', () => {
    act(() => {
      root.render(<PluginsManagementPage />);
    });

    expect(container.textContent).toContain('Plugin Demo');
    expect(container.textContent).toContain('Demo plugin');
    expect(container.textContent).toContain('extension');

    const detailButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('common.viewDetails'),
    );

    act(() => {
      detailButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const dialogContent = Array.from(document.body.querySelectorAll('[role="dialog"]')).at(-1) ?? document.body;

    expect(dialogContent.textContent).toContain('/plugins/plugin-demo.system.js');
  });
});
