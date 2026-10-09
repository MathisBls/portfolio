// Montage client commun aux pages. Build : HTML prérendu (scripts/prerender.mjs) -> hydratation.
// Dev : rendu client. Trois points d'entrée (main.tsx, main-legal.tsx, main-landing.tsx) pour que les
// mentions légales et les pages d'atterrissage ne chargent pas la scène ; les deux premiers servent les
// deux langues, le dernier les pages d'atterrissage (français seul).
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

/** `title` : titre posé en dev (sans prerender) pour une page hors ROUTES (pages d'atterrissage). */
export function mount(page: ReactNode, title?: string) {
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
    document.title = title ?? getContent(locale).text.meta[fromUrl.kind].title
    createRoot(container).render(app)
  }
}
