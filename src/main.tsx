import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './app/App'
import { pageMeta } from './app/head'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root introuvable')

const path = window.location.pathname
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

// Build : HTML prerendu (scripts/prerender.mjs) -> hydratation. Dev : rendu client.
if (container.firstElementChild) {
  hydrateRoot(container, app)
} else {
  document.title = pageMeta(path).title
  createRoot(container).render(app)
}
