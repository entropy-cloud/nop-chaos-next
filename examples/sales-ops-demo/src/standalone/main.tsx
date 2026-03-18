import React from 'react'
import ReactDOM from 'react-dom/client'
import { SalesOpsDemoPage } from '../pages/SalesOpsDemoPage'
import '@nop-chaos/theme-tokens/styles.css'
import '@nop-chaos/ui/base.css'
import '../theme.css'
import '../shell.css'
import '../component-page.css'

function StandaloneApp() {
  return (
    <React.StrictMode>
      <main className='min-h-screen bg-background px-6 py-10 text-foreground'>
        <div className='mx-auto max-w-6xl space-y-4'>
          <div>
            <div className='eyebrow-text tracking-[0.22em]'>Standalone Preview</div>
            <h1 className='mt-3 text-3xl font-semibold'>Sales Ops Demo</h1>
            <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
              This standalone entry is for local UI development. Host integration should use the remote contribution entry.
            </p>
          </div>
          <SalesOpsDemoPage />
        </div>
      </main>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<StandaloneApp />)
