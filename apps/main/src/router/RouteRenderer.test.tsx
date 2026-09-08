import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { RouteRenderer } from './RouteRenderer';

vi.mock('@nop-chaos/core', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
  usePermissionGuard: () => true,
}));

vi.mock('@nop-chaos/ui', () => ({
  Card: ({ children }: { children: ReactNode }) => children,
  CardContent: ({ children }: { children: ReactNode }) => children,
  CardHeader: ({ children }: { children: ReactNode }) => children,
  CardTitle: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { roles: ['admin'] } }),
}));

vi.mock('./pageRegistry', () => ({
  ForbiddenPage: () => <div>Forbidden</div>,
  ServerErrorPage: () => <div>Server error</div>,
  getBuiltinPage: () => null,
}));

describe('RouteRenderer iframe security', () => {
  it('renders iframe routes with the fixed sandbox allowlist', () => {
    const markup = renderToStaticMarkup(
      <RouteRenderer
        item={{
          id: 'iframe-page',
          title: 'Embedded',
          path: '/embedded',
          pageType: 'iframe',
          icon: 'frame',
          frameSrc: 'https://example.com/embed',
        }}
      />,
    );

    expect(markup).toContain('sandbox="allow-scripts allow-same-origin allow-forms allow-popups"');
    expect(markup).toContain('src="https://example.com/embed"');
  });
});
