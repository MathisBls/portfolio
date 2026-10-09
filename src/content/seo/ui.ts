// Libellés d'interface des pages d'atterrissage (français seulement : src/app/pages/LandingPage.tsx).
import { typesetFrench } from '../../lib/typography'

export const landingUi = typesetFrench({
  breadcrumb: 'Fil d’Ariane',
  home: 'Accueil',
  /** Nom accessible du lien « Mathis Boulais » de la nav, hors de l'accueil. */
  homeLink: 'Mathis Boulais, page d’accueil',
  factsLabel: 'En bref',
  ctaPrimary: 'Demander un devis',
  ctaSecondary: 'Voir les réalisations',
  ctaContact: 'Décrire mon projet',
  /** Ligne sous le bouton du CTA final : coordonnées directes. */
  direct: 'Ou directement',
  projectLink: 'Voir le projet',
  caseStudyLink: 'Lire l’étude de cas',
  faq: { label: 'Questions fréquentes', title: 'Les questions qu’on me pose' },
  seeAlso: 'Voir aussi',
  allWork: 'Tous les projets et les services',
})
