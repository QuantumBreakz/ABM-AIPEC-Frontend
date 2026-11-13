import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme, readTheme } from './lib/theme'

async function start() {
  // Apply the saved theme before the first paint so there is no light/dark flash.
  applyTheme(readTheme())

  // With VITE_API_MOCK=true a fake backend answers every /api call (see src/mocks).
  if (import.meta.env.VITE_API_MOCK === 'true') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
