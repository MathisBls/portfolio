// Entrée de prerender (vite build --ssr). Aucun accès à window ici ni pendant le rendu des composants.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './app/App'
import { renderHead } from './app/head'

export function render(path: string): { head: string; html: string } {
  return {
    head: renderHead(path),
    html: renderToString(
      <StrictMode>
        <App path={path} />
      </StrictMode>,
    ),
  }
}
