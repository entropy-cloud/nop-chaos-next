import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import { Toaster } from '@nop-chaos/ui';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import { ConfirmDialogHost } from './components/common/ConfirmDialogHost';
import i18n from './config/i18n';
import { bootstrapExtensions } from './extensions/bootstrap';
import './config/i18n';
import './styles/tailwind.css';
import '../../../packages/theme-tokens/src/styles.css';
import './styles/flux-host-token-extension.css';
import '@nop-chaos/ui/styles.css';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof Error && /401|403|404/.test(error.message)) {
          return false;
        }

        return failureCount < 1;
      },
    },
  },
});

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <App />
          <ConfirmDialogHost />
          <Toaster richColors position="top-right" />
        </HashRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

function renderBootstrapFallback(error: Error) {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  const fallbackHeading = i18n.isInitialized ? i18n.t('errors.bootstrapFailed') : 'Bootstrap failed';
  const fallbackDescription = i18n.isInitialized
    ? i18n.t('errors.bootstrapDescription')
    : 'The application could not finish startup.';

  const heading = document.createElement('h1');
  heading.textContent = fallbackHeading;
  heading.style.fontSize = '1.25rem';
  heading.style.fontWeight = '600';

  const description = document.createElement('p');
  description.textContent = fallbackDescription;
  description.style.fontSize = '0.95rem';

  const message = document.createElement('p');
  message.textContent = error.message;
  message.style.fontSize = '0.875rem';

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.minHeight = '100vh';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.flexDirection = 'column';
  container.style.gap = '1rem';
  container.style.padding = '2rem';
  container.style.textAlign = 'center';

  container.appendChild(heading);
  container.appendChild(description);
  container.appendChild(message);
  rootEl.appendChild(container);
}

export async function bootstrap() {
  try {
    await bootstrapExtensions();
    renderApp();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    renderBootstrapFallback(new Error(message));
  }
}

void bootstrap();
