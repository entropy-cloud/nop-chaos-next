// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarUserMenu } from './SidebarUserMenu';

const navigateMock = vi.fn();
const openMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => String(options?.defaultValue ?? key) }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'tester', roles: ['admin'] },
  }),
}));

vi.mock('../../hooks/useShellConfig', () => ({
  useShellConfig: () => ({
    shell: {
      helpUrl: 'https://example.com/help',
      aboutUrl: 'https://example.com/about',
      supportUrl: 'https://example.com/support',
    },
  }),
}));

vi.mock('@nop-chaos/ui', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ render, children }: { render: React.ReactNode; children: React.ReactNode }) => (
    <div>
      {render}
      {children}
    </div>
  ),
}));

describe('SidebarUserMenu shell links', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    navigateMock.mockReset();
    openMock.mockReset();
    vi.stubGlobal('open', openMock);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('opens help, about, and support links from the user menu', async () => {
    await act(async () => {
      root.render(<SidebarUserMenu onLogout={() => undefined} />);
    });

    for (const key of ['help', 'about', 'support']) {
      await act(async () => {
        container
          .querySelector(`[data-testid="sidebar-user-menu-${key}"]`)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }

    expect(openMock).toHaveBeenNthCalledWith(
      1,
      'https://example.com/help',
      '_blank',
      'noopener,noreferrer',
    );
    expect(openMock).toHaveBeenNthCalledWith(
      2,
      'https://example.com/about',
      '_blank',
      'noopener,noreferrer',
    );
    expect(openMock).toHaveBeenNthCalledWith(
      3,
      'https://example.com/support',
      '_blank',
      'noopener,noreferrer',
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
