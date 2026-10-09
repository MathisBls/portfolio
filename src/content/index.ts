// Contenu prêt à l'emploi par langue : dictionnaire (textes) + données communes fusionnées (projets,
// services, identité), prix et numéros mis en forme selon la langue. Calculé une fois au chargement.
// Les composants le lisent avec useContent() (useContent.ts) ; le rendu serveur et le client
// fournissent la même langue (LocaleContext), donc l'hydratation est identique.
import { formatEuros, formatPhone } from '../lib/content'
import type { Dictionary, ProjectCopy, ServiceCopy } from './dictionary'
import { en } from './en'
import { fr } from './fr'
import { LOCALES, type Locale, type PageKind, ROUTES } from './locales'
import { type Project, projects } from './projects'
import { type Service, identity, services } from './services'

export type LocalizedProject = Project & ProjectCopy

export type LocalizedService = ServiceCopy & {
  id: Service['id']
  /** Montant mis en forme (« 900 € », « €900 », « Sur devis »). */
  price: string
  priceFrom: boolean
}

export type LocalizedIdentity = typeof identity & Dictionary['identity']

export type Content = {
  locale: Locale
  text: Dictionary
  identity: LocalizedIdentity
  projects: LocalizedProject[]
  services: LocalizedService[]
  /** URL des pages dans cette langue. */
  routes: Record<PageKind, string>
}

export const DICTIONARIES: Record<Locale, Dictionary> = { fr, en }

function build(locale: Locale): Content {
  const text = DICTIONARIES[locale]
  return {
    locale,
    text,
    identity: {
      ...identity,
      ...text.identity,
      phone: formatPhone(identity.phone, locale),
      host: { ...identity.host, phone: formatPhone(identity.host.phone, locale) },
    },
    projects: projects.map((project) => ({ ...project, ...text.projects.items[project.slug] })),
    services: services.map(({ id, price, priceFrom }) => ({
      ...text.services.items[id],
      id,
      priceFrom,
      price: price
        ? formatEuros(price.amount, locale, price.perMonth ? text.services.perMonth : '')
        : text.services.customQuote,
    })),
    routes: ROUTES[locale],
  }
}

const CONTENT = Object.fromEntries(LOCALES.map((locale) => [locale, build(locale)])) as Record<
  Locale,
  Content
>

export function getContent(locale: Locale): Content {
  return CONTENT[locale]
}
