// <head> par page, injecté au prerender (scripts/prerender.mjs) ; en dev, seul document.title est posé.
import { site } from '../content/site'
import { isFilled } from '../lib/content'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const isLegalPath = (path: string) => path.startsWith(site.legalPath)

export function pageMeta(path: string) {
  return isLegalPath(path) ? site.meta.legal : site.meta.home
}

export function renderHead(path: string): string {
  const { title, description } = pageMeta(path)
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
  ]
  if (isFilled(site.url)) {
    const canonical = new URL(path, site.url).href
    tags.push(`<link rel="canonical" href="${escape(canonical)}" />`)
    tags.push(`<meta property="og:url" content="${escape(canonical)}" />`)
  }
  return tags.join('\n    ')
}
