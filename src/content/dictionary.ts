// Forme des dictionnaires (src/content/fr.ts, en.ts) : les deux langues ont exactement les mêmes clés
// (vérifié par le typage et par i18n.test.ts, tableaux de même longueur compris). Seuls les textes y
// vivent ; ancres, liens, prix chiffrés et coordonnées sont communs (site.ts, projects.ts, services.ts).
import type { ProjectType } from '../lib/form'
import type { PageKind } from './locales'
import type { ProjectSlug } from './projects'
import type { ServiceId } from './services'
import type { SectionKey } from './site'

type Meta = { title: string; description: string }

export type ProjectCopy = {
  name: string
  /** Contexte factuel, dans la ligne mono du chapitre (« Projet client », « Projet personnel »…). */
  context: string
  tagline: string
  description: string
  /** Fait marquant affiché à côté du projet (fourni par Mathis). */
  highlight?: string
}

export type ServiceCopy = { title: string; for: string; includes: string[] }

export type Dictionary = {
  meta: Record<PageKind, Meta> & {
    /** Texte alternatif de l'image de partage (public/og/og-<langue>.jpg). */
    ogImageAlt: string
  }
  skipLink: string
  /** Sélecteur de langue (nav, menu mobile, footer). */
  lang: { label: string }
  identity: { role: string; location: string; status: string; pitch: string }
  nav: {
    label: string
    home: string
    links: Record<'projects' | 'services' | 'about', string>
    cta: string
    menuOpen: string
    menuClose: string
  }
  hero: {
    availability: string
    ctaPrimary: string
    ctaSecondary: string
    scrollHint: string
    /** Une phrase par étape du pin (docs/storyboards/story-v2.md), fenêtres dans lib/hero.ts (CAPTIONS). */
    captions: string[]
  }
  sections: Record<SectionKey, { label: string; title: string }>
  projects: {
    intro: string
    stackLabel: string
    links: { site: string; store: string; github: string }
    newTab: string
    /** Remplace l'année d'un projet pas encore sorti. */
    inDevelopment: string
    items: Record<ProjectSlug, ProjectCopy>
  }
  /** Bandeau entre Projets et Services : ces mots s'ajoutent aux titres des services (ui/Marquee.tsx). */
  marquee: string[]
  services: {
    intro: string
    /** Préfixe des prix « à partir de », affiché en petit devant le montant. */
    fromLabel: string
    forLabel: string
    includesLabel: string
    /** Prix sans montant (services.ts : price null). */
    customQuote: string
    /** Suffixe d'un prix mensuel. */
    perMonth: string
    cta: string
    items: Record<ServiceId, ServiceCopy>
  }
  about: { lines: string[]; stackLabel: string; availability: string }
  contact: {
    intro: string
    direct: string
    emailLabel: string
    phoneLabel: string
    locationLabel: string
    sirenLabel: string
    form: {
      label: string
      name: string
      email: string
      message: string
      projectType: string
      projectTypePlaceholder: string
      /** Menu déroulant (lib/form.ts, PROJECT_TYPES) : une étiquette par type. */
      projectTypes: Record<ProjectType, string>
      /** Affiché seulement quand « 18+ » est choisi : la pièce d'identité ne passe jamais par le site. */
      adultNotice: string
      submit: string
      sending: string
      success: string
      error: string
      required: string
      invalidEmail: string
      honeypot: string
      privacy: string
      privacyLink: string
    }
  }
  legal: {
    intro: string
    editor: string
    publisher: string
    host: string
    data: { title: string; text: string[] }
    cookies: { title: string; text: string }
    ip: { title: string; text: string[] }
    labels: {
      name: string
      status: string
      siren: string
      address: string
      email: string
      phone: string
      website: string
    }
  }
  footer: { legal: string; home: string }
  /** Overlay de l'easter egg (src/easter/). Sous-titres et HUD : communs (site.ts). */
  easter: {
    label: string
    /** Description accessible de toute la séquence (aria-describedby du dialogue). */
    description: string
    loading: string
    noWebGL: string
    sound: string
    soundOn: string
    soundOff: string
    exit: string
    exitKey: string
    /** Message tapé sur la route (src/easter/times.ts, T.lines) : chaque ligne remplace la précédente. */
    lines: string[]
    /** Second niveau « Le Sanctuaire » : annonce (aria-live) au déclenchement, message de fin. */
    majestic: { unlocked: string; thanks: string }
  }
}
