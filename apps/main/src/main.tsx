import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import { Toaster } from '@nop-chaos/ui';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n, { initializeI18n } from './config/i18n';
import { bootstrapExtensions } from './extensions/bootstrap';
import './config/i18n';
import './styles/tailwind.css';
import '../../../packages/theme-tokens/src/styles.css';
import '@nop-chaos/ui/styles.css';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <App />
          <Toaster richColors position="top-right" />
        </HashRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

async function bootstrap() {
  await initializeI18n();
  await bootstrapExtensions();
  renderApp();
}

void bootstrap();
