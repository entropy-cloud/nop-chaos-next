import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { PluginSlot } from './PluginSlot';

const loadRemoteComponentMock = vi.fn();

vi.mock('../utils/systemjs', () => ({
  loadRemoteComponent: (url: string) => loadRemoteComponentMock(url),
}));

describe('PluginSlot', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.useFakeTimers();
    loadRemoteComponentMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  it('renders the loaded remote component', async () => {
    loadRemoteComponentMock.mockResolvedValue(() => <div>remote plugin</div>);

    await act(async () => {
      root.render(<PluginSlot title="Remote" url="/plugins/remote.system.js" />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('remote plugin');
    expect(loadRemoteComponentMock).toHaveBeenCalledWith(
      expect.stringContaining('/plugins/remote.system.js?t='),
    );
  });

  it('shows load error when remote module rejects', async () => {
    loadRemoteComponentMock.mockRejectedValue(new Error('Remote module exploded'));

    await act(async () => {
      root.render(<PluginSlot title="Remote" url="/plugins/remote.system.js" />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Remote module exploded');
  });

  it('shows timeout error when remote module never resolves', async () => {
    loadRemoteComponentMock.mockImplementation(() => new Promise(() => undefined));

    await act(async () => {
      root.render(<PluginSlot title="Remote" url="/plugins/slow.system.js" />);
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(container.textContent).toContain('Plugin load timed out after 10000ms: /plugins/slow.system.js');
  });
});
