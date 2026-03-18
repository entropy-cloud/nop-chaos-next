import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { Toaster } from '@nop-chaos/ui'
import App from './App'
import { bootstrapContributions } from './contributions/bootstrap'
import './config/i18n'
import './styles/tailwind.css'
import '../../../packages/theme-tokens/src/styles.css'
import '../../../packages/ui/src/styles/index.css'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }
  }
})

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
          <Toaster richColors position="top-right" />
        </HashRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

async function bootstrap() {
  await bootstrapContributions()
  renderApp()
}

void bootstrap()
