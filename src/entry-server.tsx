// Entrée de prerender (vite build --ssr). Aucun accès à window ici ni pendant le rendu des composants.
// La langue vient de l'URL de la page (content/locales.ts) et est fournie par LocaleContext, comme au
// montage client (app/mount.tsx) : l'hydratation retrouve exactement le même rendu.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './app/App'
import { renderHead } from './app/head'
import { PAGES, ROUTES, pageFromPath } from './content/locales'
import { LocaleContext } from './content/useContent'

/** URL des pages à prérendre, avec leur langue (attribut lang attendu sur <html>). */
export const pages = PAGES.map((page) => ({
  url: ROUTES[page.locale][page.kind],
  lang: page.locale,
}))

export function render(url: string): { head: string; html: string } {
  const page = pageFromPath(url)
  return {
    head: renderHead(page),
    html: renderToString(
      <StrictMode>
        <LocaleContext value={page.locale}>
          <App kind={page.kind} />
        </LocaleContext>
      </StrictMode>,
    ),
  }
}
