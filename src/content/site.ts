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
  nav: {
    label: 'Navigation principale',
    home: 'Mathis Boulais, retour en haut de page',
    links: [
      { href: '#projets', label: 'Projets' },
      { href: '#services', label: 'Services' },
      { href: '#a-propos', label: 'À propos' },
    ],
    cta: { href: '#contact', label: 'Discuter d’un projet' },
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
  },
  hero: {
    // Le h1 et le rôle viennent de identity (services.ts). Un mot du h1 = un <span data-word>.
    availability: 'Disponible pour des missions',
    ctaPrimary: { href: '#contact', label: 'Discuter d’un projet' },
    ctaSecondary: { href: '#projets', label: 'Voir les projets' },
    scrollHint: 'Faites défiler',
  },
  sections: {
    hero: { id: 'accueil', label: '00 / Accueil', title: 'Accueil' },
    projects: {
      id: 'projets',
      label: '01 / Projets',
      title: 'Une idée en entrée, plusieurs projets en sortie',
    },
    services: { id: 'services', label: '02 / Services', title: 'Ce que je fais pour vous' },
    about: { id: 'a-propos', label: '03 / À propos', title: 'Un seul interlocuteur' },
    contact: { id: 'contact', label: '04 / Contact', title: 'Parlons de votre projet' },
  } satisfies Record<SectionKey, SectionText>,
  projects: {
    intro:
      'Quatre produits que je construis, un site livré à un client. Chaque fois, de l’idée à la mise en ligne.',
    // Label mono de la card : `${index} / ${year}`, index sur 2 chiffres (01, 02…)
    stackLabel: 'Stack',
    links: { site: 'Voir le site', store: 'App Store', github: 'Code source' },
    newTab: '(nouvel onglet)',
  },
  services: {
    intro: 'Trois façons de travailler ensemble. Un devis clair, un seul interlocuteur.',
    forLabel: 'Pour qui',
    includesLabel: 'Inclus',
    cta: { href: '#contact', label: 'Discuter d’un projet' },
  },
  about: {
    // Rédigé depuis identity et projects.ts, aucun fait ajouté. À valider par Mathis.
    lines: [
      'Développeur full stack basé à Choisy-le-Roi, en Île-de-France.',
      'Je construis mes propres produits : une app de navigation publiée sur l’App Store, un gestionnaire de mods open source, une ROM Android, une chaîne de création de jeux par agents IA.',
      'Et des sites pour des commerces, comme celui de Meme Rina, pizzeria à Chatou.',
      'Du design au déploiement, vous parlez à la personne qui écrit le code.',
    ],
    stackLabel: 'Technologies utilisées dans ces projets',
    availability: 'Disponible pour des missions',
  },
  contact: {
    intro: 'Décrivez votre projet en quelques lignes. Je vous recontacte pour en parler.',
    direct: 'Coordonnées',
    emailLabel: 'Email',
    phoneLabel: 'Téléphone',
    locationLabel: 'Basé à',
    sirenLabel: 'SIREN',
    form: {
      label: 'Formulaire de contact',
      name: 'Nom',
      email: 'Email',
      message: 'Votre projet',
      submit: 'Envoyer le message',
      sending: 'Envoi en cours…',
      success: 'Message envoyé. Je vous réponds au plus vite.',
      error: 'L’envoi a échoué. Vous pouvez m’écrire directement à',
      required: 'Ce champ est obligatoire.',
      invalidEmail: 'Cette adresse email n’est pas valide.',
      honeypot: 'Ne pas remplir ce champ',
      privacy: 'Vos données servent uniquement à vous répondre.',
      privacyLink: 'En savoir plus',
    },
  },
  legal: {
    intro: 'Informations légales et politique de confidentialité du site.',
    editor: 'Éditeur du site',
    publisher: 'Directeur de la publication',
    host: 'Hébergement',
    data: {
      title: 'Données personnelles',
      text: [
        'Le formulaire de contact collecte votre nom, votre email et votre message. Ces données servent uniquement à vous répondre et ne sont ni vendues ni cédées.',
        'Elles sont stockées par l’hébergeur (Netlify Forms).',
        'Durée de conservation : TODO: à valider (proposition : 12 mois après le dernier échange).',
        'Vous pouvez demander l’accès, la rectification ou la suppression de vos données en écrivant à l’adresse email ci-dessus. Vous pouvez aussi saisir la CNIL (cnil.fr).',
      ],
    },
    cookies: {
      title: 'Cookies',
      text: 'Ce site n’utilise aucun cookie ni outil de mesure d’audience.',
    },
    ip: {
      title: 'Propriété intellectuelle et crédits',
      text: [
        'Textes, visuels et modèles 3D : © Mathis Boulais.',
        'Polices Instrument Serif, Inter et JetBrains Mono, sous licence SIL Open Font License 1.1.',
      ],
    },
    labels: {
      status: 'Statut',
      siren: 'SIREN',
      address: 'Adresse',
      email: 'Email',
      phone: 'Téléphone',
      website: 'Site',
    },
  },
  footer: {
    legal: 'Mentions légales',
    home: 'Retour à l’accueil',
  },
}
