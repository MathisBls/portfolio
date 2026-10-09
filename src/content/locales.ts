// Langues et routes du site (aucune dépendance) : le français est la langue principale (`/`), l'anglais
// vit sous `/en/`. Chaque page existe dans les deux langues, en HTML prérendu (scripts/prerender.mjs).
// Source unique des URL : head.ts (canonical, hreflang), le sélecteur de langue, le footer, le sitemap
// (public/sitemap.xml, à garder synchronisé) et le prerender.

export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

/** Nom de chaque langue dans sa propre langue (sélecteur de langue). */
export const LANGUAGE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' }

/** og:locale de chaque langue. */
export const OG_LOCALES: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US' }

/** Clé localStorage du choix de langue (sélecteur), lue par le script de redirection (langRedirect.ts). */
export const LANG_STORAGE_KEY = 'lang'

export type PageKind = 'home' | 'legal'

export const ROUTES: Record<Locale, Record<PageKind, string>> = {
  fr: { home: '/', legal: '/mentions-legales/' },
  en: { home: '/en/', legal: '/en/legal/' },
}

export type Page = { locale: Locale; kind: PageKind }

/** Toutes les pages prérendues, langue principale d'abord. */
export const PAGES: readonly Page[] = LOCALES.flatMap((locale) =>
  (['home', 'legal'] as const).map((kind) => ({ locale, kind })),
)

/** Page d'une URL (chemin seul). Inconnue : accueil de la langue du préfixe. */
export function pageFromPath(path: string): Page {
  const clean = path.replace(/index\.html$/, '')
  const locale: Locale = clean === '/en' || clean.startsWith('/en/') ? 'en' : 'fr'
  const kind: PageKind = clean.replace(/\/?$/, '/') === ROUTES[locale].legal ? 'legal' : 'home'
  return { locale, kind }
}
