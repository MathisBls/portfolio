// Langue de la page, fournie une fois au montage (src/app/mount.tsx côté client, src/entry-server.tsx au
// prerender) : <LocaleContext value={locale}>. Jamais changée après coup : changer de langue, c'est
// changer de page (sélecteur de langue, ui/LangSwitch.tsx).
import { createContext, use } from 'react'
import { type Content, getContent } from './index'
import { DEFAULT_LOCALE, type Locale } from './locales'

export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function useLocale(): Locale {
  return use(LocaleContext)
}

/** Contenu de la langue de la page : textes, identité, projets, services, routes. */
export function useContent(): Content {
  return getContent(use(LocaleContext))
}
