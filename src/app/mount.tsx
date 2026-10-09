// Montage client commun aux pages. Build : HTML prérendu (scripts/prerender.mjs) -> hydratation.
// Dev : rendu client. Deux points d'entrée (main.tsx, main-legal.tsx) pour que les mentions légales ne
// chargent ni GSAP, ni Lenis, ni la scène ; chacun sert les deux langues.
// Langue : celle du <html lang> posé par le gabarit de la page (index.html, en/index.html…), donc celle
// du rendu serveur ; à défaut, celle de l'URL. Fournie une fois, jamais changée ensuite.
import { type ReactNode, StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { getContent } from '../content'
import { isLocale, pageFromPath } from '../content/locales'
import { LocaleContext } from '../content/useContent'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/global.css'

export function mount(page: ReactNode) {
  const container = document.getElementById('root')
  if (!container) throw new Error('#root introuvable')
  const fromUrl = pageFromPath(window.location.pathname)
  const lang = document.documentElement.lang
  const locale = isLocale(lang) ? lang : fromUrl.locale
  const app = (
    <StrictMode>
      <LocaleContext value={locale}>{page}</LocaleContext>
    </StrictMode>
  )
  if (container.firstElementChild) {
    hydrateRoot(container, app)
  } else {
    document.title = getContent(locale).text.meta[fromUrl.kind].title
    createRoot(container).render(app)
  }
}
