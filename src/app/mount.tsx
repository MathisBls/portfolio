// Montage client commun aux deux pages. Build : HTML prérendu (scripts/prerender.mjs) -> hydratation.
// Dev : rendu client. Chaque page a son propre point d'entrée (main.tsx, main-legal.tsx) pour que
// les mentions légales ne chargent ni GSAP, ni Lenis, ni la scène.
import { type ReactNode, StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { pageMeta } from './head'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/global.css'

export function mount(page: ReactNode) {
  const container = document.getElementById('root')
  if (!container) throw new Error('#root introuvable')
  const app = <StrictMode>{page}</StrictMode>
  if (container.firstElementChild) {
    hydrateRoot(container, app)
  } else {
    document.title = pageMeta(window.location.pathname).title
    createRoot(container).render(app)
  }
}
