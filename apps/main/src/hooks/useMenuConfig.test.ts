// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('../services/menuApi', () => ({
  fetchMenuConfig: vi.fn(),
}));

import { useAuthStore } from '../store/authStore';
import { useMenuConfigQuery } from './useMenuConfig';

describe('useMenuConfigQuery', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mockUseQuery.mockReset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
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

  function TestHarness({ enabled = true }: { enabled?: boolean }) {
    useMenuConfigQuery(enabled);
    return null;
  }

  it('keys queries by concrete token value', () => {
    useAuthStore.setState({
      user: { id: 'u1', username: 'test', roles: [] },
      isAuthenticated: true,
      token: 'token-a',
      tokens: { accessToken: 'token-a' },
      bootstrapStatus: 'ready',
    });

    act(() => {
      root.render(createElement(TestHarness));
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['menus', 'u1', 'token-a'] }),
    );
  });

  it('preserves enabled=false for bootstrap gating', () => {
    act(() => {
      root.render(createElement(TestHarness, { enabled: false }));
    });

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
