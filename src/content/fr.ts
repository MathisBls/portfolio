// Textes français (langue principale, `/`). Forme : dictionary.ts. Clients visés : artisans, commerçants,
// TPE. Vouvoiement, phrases courtes, zéro jargon creux. Les mentions légales françaises font foi.
// Écrire avec des espaces normales : typesetFrench pose les insécables (avant : ; ? ! €, dans « »).
import { typesetFrench } from '../lib/typography'
import type { Dictionary } from './dictionary'

export const fr: Dictionary = typesetFrench<Dictionary>({
  meta: {
    home: {
      title: 'Mathis Boulais · Création de sites internet et d’applications',
      description:
        'Sites vitrines, boutiques en ligne et applications pour artisans, commerçants et indépendants à Paris. Prix annoncé avant de commencer.',
    },
    legal: {
      title: 'Mathis Boulais · Mentions légales',
      description:
        'Mentions légales et politique de confidentialité du site de Mathis Boulais, développeur web.',
    },
    ogImageAlt:
      'Mathis Boulais, développeur web freelance : sites internet et applications, du design à la mise en ligne.',
  },
  skipLink: 'Aller au contenu',
  lang: { label: 'Langue' },
  identity: {
    role: 'Développeur web et mobile',
    location: 'Choisy-le-Roi, près de Paris',
    status: 'Entrepreneur individuel (micro-entreprise)',
    pitch:
      'Je crée des sites et des applications pour les artisans, les commerçants et les projets qui démarrent. C’est moi qui dessine votre site, qui le code et qui le mets en ligne.',
  },
  availability: { city: 'Paris', status: 'Disponible pour de nouveaux projets' },
  nav: {
    label: 'Navigation principale',
    home: 'Mathis Boulais, retour en haut de page',
    links: {
      projects: 'Réalisations',
      services: 'Services',
      about: 'À propos',
      contact: 'Contact',
    },
    cta: 'Démarrer un projet',
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
  },
  hero: {
    titleLocation: 'à Paris',
    ctaPrimary: 'Démarrer un projet',
    ctaSecondary: 'Voir les réalisations',
    scrollHint: 'Faites défiler',
    captions: [
      'Tout projet commence par une idée.',
      'Je la transforme en design, en code, puis en produit fini.',
      'Voici ce qui est sorti du prisme.',
    ],
  },
  sections: {
    hero: { label: '00 / Accueil', title: 'Accueil' },
    projects: { label: '01 / Réalisations', title: 'Ce qui est sorti du prisme' },
    services: { label: '02 / Services', title: 'Ce que je propose, et à quel prix' },
    about: { label: '03 / À propos', title: 'Je m’appelle Mathis.' },
    contact: { label: '04 / Contact', title: 'Parlez-moi de votre projet.' },
  },
  projects: {
    intro:
      'Mes propres produits et des projets faits pour des clients.',
    stackLabel: 'Technologies',
    posterAlt: 'Illustration 3D du projet {name}',
    links: { site: 'Voir le site', store: 'App Store', github: 'Code source' },
    newTab: '(s’ouvre dans un nouvel onglet)',
    inDevelopment: 'En développement',
    items: {
      zephyr: {
        name: 'Zephyr',
        context: 'Projet communautaire · Open source',
        tagline: 'Gestionnaire de mods open source',
        description:
          'Application de bureau pour installer et gérer des mods depuis Thunderstore, NexusMods, CurseForge et GitHub. Profils partageables, éditeur de configuration intégré, module de tirage aléatoire.',
        highlight: { value: '25+', label: 'étoiles sur GitHub' },
      },
      wegir: {
        name: 'Wegir',
        context: 'Mon produit',
        tagline: 'Navigation GPS en convoi',
        description:
          'Application mobile et web pour rouler à plusieurs sans se perdre : itinéraire partagé, positions en direct, talkie-walkie, alertes. Disponible sur l’App Store.',
      },
      fitness: {
        // L'app n'a pas encore de nom : nom descriptif. Description d'après les écrans de Mathis.
        name: 'Application de coaching sportif',
        context: 'Projet client',
        tagline: 'Coaching, entraînement et nutrition dans une seule appli',
        description:
          'Application mobile de fitness : programmes d’entraînement, du gratuit au coaching personnalisé, suivi nutritionnel avec les macros, courbes de progression avec mensurations et photos. Abonnement premium via l’App Store et Google Play.',
      },
      'game-factory': {
        name: 'Game Factory',
        context: 'Projet personnel · Outil pour développeurs',
        tagline: 'Des jeux fabriqués par des agents IA',
        description:
          'Une chaîne d’agents IA qui transforme une idée en jeu mobile Godot : tickets, code, pull requests et relectures, générés automatiquement sur GitHub.',
      },
      'meme-rina': {
        name: 'Meme Rina',
        context: 'Projet client',
        tagline: 'Site vitrine pour une pizzeria',
        // Rédigée d'après le site en ligne (oct. 2026), à valider par Mathis
        description:
          'Le site d’une pizzeria de quartier à Chatou, près de Paris. La carte complète, la réservation de table, la commande en livraison et les avis Google, tout est à un geste de la page d’accueil.',
      },
    },
  },
  marquee: ['Design', 'Développement', 'Mise en ligne'],
  services: {
    intro: 'Le prix est annoncé avant de commencer, le devis détaille tout.',
    fromLabel: 'à partir de',
    forLabel: 'Pour qui',
    includesLabel: 'Inclus',
    customQuote: 'Sur devis',
    perMonth: '/mois',
    cta: 'Demander un devis',
    items: {
      website: {
        title: 'Site vitrine',
        for: 'Artisans, commerçants et indépendants qui veulent être trouvés sur Google, puis appelés.',
        includes: [
          'Design sur mesure, pas de modèle tout fait',
          'Rapide et lisible sur mobile',
          'Référencement local (fiche Google, pages métier et ville)',
          'Formulaire de contact et prise de rendez-vous',
          'Mise en ligne, nom de domaine et adresse email pro',
        ],
      },
      app: {
        title: 'Application web ou mobile',
        for: 'Un outil métier, une appli pour vos clients, une première version à lancer vite et bien.',
        includes: [
          'Cadrage et maquettes',
          'React / React Native, API Node',
          'Paiement, comptes clients, notifications',
          'Publication sur l’App Store et Google Play',
          'Code documenté, qui vous appartient',
        ],
      },
      maintenance: {
        title: 'Refonte et maintenance',
        for: 'Un site existant trop lent, daté, ou que plus personne ne sait modifier.',
        includes: [
          'Audit de vitesse, d’affichage mobile et de référencement',
          'Refonte complète ou corrections ciblées',
          'Mises à jour, sauvegardes, surveillance',
          'Réponse sous 24 h',
        ],
      },
    },
  },
  about: {
    // Réécrit le 2026-10-10 (Mathis : l'ancien texte « fait beaucoup trop IA »). Faits seulement : lieu,
    // projets (docs/projets-contexte.md), réponse sous 24 h (déjà promise dans les services).
    lines: [
      'Je développe des sites et des applications à Choisy-le-Roi, à côté de Paris.',
      'J’ai sorti Wegir, une appli de GPS pour rouler en convoi, sur l’App Store. Je maintiens Zephyr, un gestionnaire de mods open source. Game Factory fait fabriquer des jeux mobiles par des agents IA.',
      'Côté clients, j’ai fait le site de Meme Rina, une pizzeria de Chatou, et je développe une appli de coaching sportif.',
      'Vous avez un projet ? Écrivez-moi, je réponds sous 24 h.',
    ],
    // Faits vérifiés dans docs/projets-contexte.md (§6) : PR #518 d'OpenCut fusionnée, plugin NicePrice.
    openSource: {
      lead: 'Open source :',
      fix: 'un correctif fusionné dans OpenCut',
      stars: '(93 000 étoiles), et',
      plugin: 'NicePrice',
      rest: ', mon plugin pour Millennium.',
    },
    stackLabel: 'Technologies utilisées dans ces projets',
    portrait: { alt: 'Portrait de Mathis Boulais', caption: 'Mathis Boulais, Paris' },
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
      projectType: 'Type de projet',
      projectTypePlaceholder: 'Choisissez…',
      projectTypes: {
        website: 'Site vitrine',
        shop: 'Boutique en ligne',
        webapp: 'Application web',
        mobile: 'Application mobile',
        redesign: 'Refonte ou maintenance',
        adult: 'Plateforme 18+ (contenu adulte)',
        devtools: 'Outil développeur, automatisation, IA',
        other: 'Autre chose',
      },
      adultNotice:
        'Pour les projets 18+, je demande une copie de votre pièce d’identité avant tout travail, par un canal sécurisé. Ne l’envoyez pas par ce formulaire.',
      submit: 'Envoyer le message',
      sending: 'Envoi en cours…',
      success: 'Message envoyé. Je vous réponds très vite.',
      error: 'L’envoi a échoué. Vous pouvez m’écrire directement à',
      required: 'Ce champ est obligatoire.',
      invalidEmail: 'Cette adresse email n’est pas valide.',
      honeypot: 'Ne pas remplir ce champ',
      privacy: 'Vos coordonnées servent uniquement à vous répondre.',
      privacyLink: 'En savoir plus',
    },
  },
  // Font foi juridiquement (la version anglaise le précise). Même contenu que la version anglaise.
  legal: {
    intro: 'Informations légales et politique de confidentialité du site mathisboulais.com.',
    editor: 'Éditeur du site',
    publisher: 'Directeur de la publication',
    host: 'Hébergeur',
    data: {
      title: 'Données personnelles',
      text: [
        'Le formulaire de contact collecte votre nom, votre adresse email, le type de projet et votre message. Ces données servent uniquement à vous répondre. Elles ne sont ni vendues ni transmises à des tiers.',
        'Aucune pièce d’identité (demandée pour les projets 18+) n’est collectée par ce site.',
        'Votre message m’est transmis par email. Il n’est pas conservé sur le serveur web (hébergé par alwaysdata).',
        'Pour prévenir les abus, le serveur conserve temporairement une empreinte hachée de votre adresse IP (environ 10 minutes). Elle ne sert à rien d’autre.',
        'Les messages sont conservés dans ma messagerie pendant 12 mois après notre dernier échange, puis supprimés.',
        'Conformément au RGPD et à la loi Informatique et Libertés, vous pouvez demander l’accès à vos données, leur rectification ou leur effacement en écrivant à l’adresse email ci-dessus. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).',
      ],
    },
    cookies: {
      title: 'Cookies',
      text: 'Ce site ne dépose aucun cookie. La mesure d’audience passe par Umami, un outil sans cookies qui ne collecte aucune donnée personnelle : seulement les pages vues, le pays et le type d’appareil, de façon anonyme. Si vous choisissez une langue, ce choix est enregistré dans votre navigateur (stockage local) et n’est jamais transmis.',
    },
    ip: {
      title: 'Propriété intellectuelle et crédits',
      text: [
        'Textes, visuels et modèles 3D : © Mathis Boulais.',
        'Polices Instrument Serif, Inter et JetBrains Mono, sous licence SIL Open Font License 1.1.',
        'Textures des planètes : Solar System Scope (solarsystemscope.com), d’après des données de la NASA, licence CC BY 4.0. Panorama de la Voie lactée : ESO/S. Brunier, licence CC BY 4.0.',
        'Textures de bois, velours, cuir, marbre, roche et sable : Poly Haven (CC0).',
      ],
    },
    labels: {
      name: 'Nom',
      status: 'Statut juridique',
      siren: 'SIREN',
      address: 'Adresse',
      email: 'Email',
      phone: 'Téléphone',
      website: 'Site web',
    },
  },
  footer: {
    legal: 'Mentions légales',
    home: 'Retour à l’accueil',
  },
  easter: {
    label: 'Niveau secret',
    description:
      'Un prisme de verre vole en éclats, une arène de cartes s’illumine et trois cartes se retournent. Puis une route à la vitesse de la lumière, le long de mes projets. Le vaisseau sort de l’hyperespace en plein cosmos et Houston appelle à la radio : un signal approche, et il s’appelle BoulardTV. Les portes d’un parc d’attractions spatial s’ouvrent. Vous le traversez en vaisseau, entre écrans géants, planètes et montagnes russes, jusqu’à un B géant. À la fin, un mot de passe ouvre un niveau secret : tapez-le, ou touchez l’écran cinq fois. Le vaisseau plonge vers une planète au crépuscule, le sol tremble, une immense montagne gravée d’un B s’élève, et douze géants de pierre chantent autour d’elle pendant qu’un prisme de verre, au sommet, projette un arc-en-ciel dans le ciel. Purement décoratif. Appuyez sur Échap pour quitter à tout moment.',
    loading: 'Chargement…',
    noWebGL: 'Celui-ci demande WebGL 2. Appuyez sur Échap pour revenir.',
    sound: 'Son',
    soundOn: 'Activé',
    soundOff: 'Coupé',
    exit: 'Quitter',
    exitKey: '(Échap)',
    lines: [
      'Vous avez vu mes projets.',
      'Enfin… presque.',
      'Il y en a un dont je ne vous ai jamais parlé.',
    ],
    majestic: {
      unlocked: 'Niveau secret débloqué',
      thanks: 'Merci d’avoir joué',
    },
  },
})
