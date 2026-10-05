// Textes d'interface (navigation, titres de section, méta). Source unique : aucun texte en dur ailleurs.

export type SectionKey = 'hero' | 'projects' | 'services' | 'about' | 'contact'

export type SectionText = { id: string; label: string; title: string }

export const site = {
  url: 'TODO: domaine à confirmer (mathisboulais.fr ?)',
  meta: {
    home: {
      title: 'Mathis Boulais · Développeur web freelance en Île-de-France',
      description:
        'Sites vitrines, applications web et mobiles pour les indépendants, les commerces et les projets qui démarrent. Du design au déploiement, un seul interlocuteur.',
    },
    legal: {
      title: 'Mentions légales · Mathis Boulais',
      description: 'Mentions légales du site de Mathis Boulais, développeur web.',
    },
  },
  skipLink: 'Aller au contenu',
  sections: {
    hero: { id: 'accueil', label: '00 / Accueil', title: 'Accueil' },
    projects: { id: 'projets', label: '01 / Projets', title: 'Projets' },
    services: { id: 'services', label: '02 / Services', title: 'Services' },
    about: { id: 'a-propos', label: '03 / À propos', title: 'À propos' },
    contact: { id: 'contact', label: '04 / Contact', title: 'Contact' },
  } satisfies Record<SectionKey, SectionText>,
  footer: {
    legal: 'Mentions légales',
    home: 'Retour à l’accueil',
  },
}
