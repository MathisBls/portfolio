// Forme des pages d'atterrissage (référencement local, en français seulement : content/locales.ts,
// LANDING_ROUTES). Un fichier de contenu par page dans ce dossier, rendu par src/app/pages/LandingPage.tsx,
// données structurées par src/app/pages/landingSchema.ts. Seuls les textes vivent ici : prix chiffrés
// (services.ts), projets (projects.ts) et coordonnées (services.ts, identity) sont repris, jamais recopiés.
import type { LandingId } from '../locales'
import type { ProjectSlug } from '../projects'
import type { ServiceId } from '../services'

/** Un intitulé et sa phrase (publics, inclus, étapes, faits). */
export type Term = { term: string; text: string }

export type FaqItem = { question: string; answer: string }

/** Ligne de prix : un service de services.ts (montant repris), ou une offre sans prix publié (« Sur devis »). */
export type PriceItem = { service: ServiceId; text: string } | { name: string; text: string }

/** Une réalisation de la page d'accueil (lien vers son ancre), avec la phrase qui la relie à la page. */
export type Example = { project: ProjectSlug; text: string; caseStudy?: LandingId }

/** Bloc de contenu, rendu dans l'ordre et numéroté (01, 02…). `label` : nom court du bloc. */
export type LandingBlock =
  | { type: 'text'; label: string; title: string; paragraphs: string[] }
  | { type: 'terms'; label: string; title: string; intro?: string; items: Term[] }
  | { type: 'pricing'; label: string; title: string; items: PriceItem[]; note: string }
  | { type: 'steps'; label: string; title: string; steps: [Term, Term, Term, Term] }
  | { type: 'examples'; label: string; title: string; items: Example[] }

/**
 * Modèles 3D des pages d'atterrissage (public/models/landing/<nom>.glb, poster
 * public/posters/landing/<nom>.webp ; table des fichiers : src/app/pages/landingAssets.ts).
 */
export type LandingModelName = 'vitrine' | 'etabli' | 'smartphone' | 'pizza'

/** Fait de la fiche sous l'intro : texte, prix d'un service (repris de services.ts) ou lien externe. */
export type Fact = { label: string; value: string | { service: ServiceId } | { url: string } }

/** Une page. Son nom court (fil d'Ariane, footer, « Voir aussi ») est dans nav.ts. */
export type Landing = {
  meta: { title: string; description: string }
  /** Ligne mono au-dessus du titre. */
  kicker: string
  /** Titre de la page (h1). */
  title: string
  intro: string
  facts: Fact[]
  /**
   * Visuel du haut de page (src/app/pages/LandingModel.tsx) : poster du modèle (image LCP, décrite par
   * `alt`), remplacé par le modèle 3D quand il est prêt. Au plus un par page.
   */
  visual?: { model: LandingModelName; alt: string }
  /** Niveau intermédiaire du fil d'Ariane (étude de cas : Réalisations, ancre de l'accueil). */
  parent?: { name: string; href: string }
  blocks: LandingBlock[]
  /** 4 à 6 questions réelles : affichées en fin de page et en JSON-LD FAQPage. */
  faq: FaqItem[]
  cta: { title: string; text: string }
  /** Données structurées propres à la page (landingSchema.ts). */
  schema:
    | {
        type: 'service'
        /** schema.org Service.serviceType. */
        serviceType: string
        /** Zone desservie : Paris, l'Île-de-France, ou les deux. */
        area: ('Paris' | 'Île-de-France')[]
        /** Offres reprises de services.ts (prix « à partir de » en minPrice). */
        offers: ServiceId[]
      }
    | {
        type: 'case'
        project: ProjectSlug
        /** Le client, tel qu'il se présente sur son site. */
        client: { name: string; locality: string; postalCode: string }
      }
}
