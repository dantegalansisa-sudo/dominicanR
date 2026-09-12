import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { LangProvider } from './i18n'
import { CatalogProvider } from './catalog/CatalogProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
)
