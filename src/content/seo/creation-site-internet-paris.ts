// Page d'atterrissage /creation-site-internet-paris/ : site vitrine et boutique pour TPE, artisans et
// commerçants à Paris. Recherches visées : « création site internet Paris », « site vitrine Paris »,
// « création site internet TPE ». Une seule fois chaque expression, dans des phrases utiles.
// Prix repris de services.ts (prices.ts). Aucun chiffre inventé.
// Validé par Mathis le 2026-10-09 : espace pour modifier soi-même horaires, carte ou photos (FAQ) ; boutique en
// ligne avec retrait en boutique ; méthode (shared.ts).
// À COMPLÉTER PAR MATHIS : délai type d'un site vitrine (en semaines), à ajouter dans la FAQ « Combien de
// temps… » une fois connu.
import { typesetFrench } from '../../lib/typography'
import { priceText } from './prices'
import { siteSteps } from './shared'
import type { Landing } from './types'

export const websiteParis: Landing = typesetFrench<Landing>({
  meta: {
    title: 'Création de site internet à Paris · Mathis Boulais',
    description: `Site vitrine ou boutique en ligne pour TPE, artisans et commerçants à Paris. Design sur mesure, rapide sur mobile, ${priceText('website')}. Devis détaillé.`,
  },
  kicker: 'Paris · Site vitrine et boutique en ligne',
  title: 'Création de site internet à Paris pour les TPE, les artisans et les commerçants',
  intro:
    'Je crée des sites vitrines et des boutiques en ligne pour les petites entreprises de Paris. Un site rapide, clair sur téléphone, qui donne envie de vous appeler. Je le dessine, je le code et je le mets en ligne.',
  facts: [
    { label: 'Site vitrine', value: { service: 'website' } },
    { label: 'Zone', value: 'Paris et Île-de-France' },
    { label: 'Interlocuteur', value: 'Moi, du devis à la mise en ligne' },
  ],
  visual: {
    model: 'vitrine',
    alt: 'Devanture d’une boutique parisienne, un écran dans la vitrine fait défiler un site internet',
  },
  blocks: [
    {
      type: 'terms',
      label: 'Pour qui',
      title: 'Pour les petites entreprises de Paris',
      items: [
        {
          term: 'Commerces de quartier',
          text: 'Restaurant, boulangerie, caviste, fleuriste, salon de coiffure. Vos horaires, votre carte ou vos produits, votre adresse : ce que vos clients cherchent avant de passer.',
        },
        {
          term: 'Artisans',
          text: 'Plombier, électricien, menuisier, peintre. Vos réalisations en photos, votre zone d’intervention et une demande de devis en un geste.',
        },
        {
          term: 'Indépendants',
          text: 'Coach, consultant, thérapeute, architecte. Une page claire sur ce que vous faites, pour qui, et comment prendre rendez-vous.',
        },
        {
          term: 'Boutiques',
          text: 'Vous voulez vendre en ligne : un catalogue, le paiement par carte, le retrait en boutique ou la livraison.',
        },
      ],
    },
    {
      type: 'terms',
      label: 'Inclus',
      title: 'Ce que comprend un site vitrine',
      items: [
        {
          term: 'Un design sur mesure',
          text: 'Pas de modèle tout fait. Le site est dessiné pour votre activité, avec vos photos et vos mots.',
        },
        {
          term: 'Rapide sur téléphone',
          text: 'La plupart de vos visiteurs arrivent depuis leur téléphone. Le site s’affiche vite et se lit sans zoomer.',
        },
        {
          term: 'Le référencement local',
          text: 'Votre fiche Google Business Profile reliée au site, une page par métier ou par quartier si c’est utile, des textes qui répondent aux vraies questions.',
        },
        {
          term: 'Contact et rendez-vous',
          text: 'Un bouton pour appeler, un formulaire de contact, la prise de rendez-vous si vous en avez besoin.',
        },
        {
          term: 'La mise en ligne',
          text: 'Nom de domaine, adresse email pro, mise en ligne : je m’en occupe.',
        },
      ],
    },
    {
      type: 'pricing',
      label: 'Prix',
      title: 'Des prix annoncés avant de commencer',
      items: [
        {
          service: 'website',
          text: 'Le point de départ d’un site vitrine sur mesure. Le prix final dépend du nombre de pages et des fonctions.',
        },
        {
          name: 'Boutique en ligne',
          text: 'Selon le nombre de produits, le paiement et la livraison.',
        },
        {
          service: 'maintenance',
          text: 'En option, une fois le site en ligne : mises à jour, sauvegardes, surveillance. Réponse sous 24 h.',
        },
      ],
      note: 'Le devis est écrit et détaillé. Rien ne commence sans votre accord.',
    },
    {
      type: 'steps',
      label: 'Méthode',
      title: 'Comment on travaille, en quatre étapes',
      steps: siteSteps,
    },
    {
      type: 'examples',
      label: 'Exemples',
      title: 'Des projets déjà en ligne',
      items: [
        {
          project: 'meme-rina',
          text: 'Le site d’une pizzeria de quartier à Chatou : la carte, la réservation et la commande à un geste de l’accueil.',
          caseStudy: 'meme-rina',
        },
        {
          project: 'wegir',
          text: 'Mon application de navigation en convoi, publiée sur l’App Store, et son site wegir.com.',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Combien coûte un site internet à Paris ?',
      answer: `Un site vitrine sur mesure coûte ${priceText('website')}. Le prix final dépend du nombre de pages et des fonctions : réservation, boutique, plusieurs langues. Vous recevez un devis écrit avant tout travail.`,
    },
    {
      question: 'Combien de temps faut-il pour créer un site vitrine ?',
      answer:
        'Cela dépend surtout de vos contenus : textes, photos, carte ou catalogue. Le délai est écrit dans le devis, et je vous préviens dès qu’une étape attend quelque chose de votre part.',
    },
    {
      question: 'Y a-t-il un abonnement à payer chaque mois ?',
      answer: `Non, la création se paie une fois. Le nom de domaine se renouvelle chaque année : son prix est dans le devis, comme celui de l’hébergement s’il y en a un. La maintenance est en option, ${priceText('maintenance')}.`,
    },
    {
      question: 'Mon site sera-t-il visible sur Google ?',
      answer:
        'Personne ne peut promettre la première place. Je pose des bases solides : un site rapide, des textes qui répondent aux questions de vos clients, une page par service ou par quartier si c’est utile, et votre fiche Google Business Profile reliée au site.',
    },
    {
      question: 'Pourrai-je modifier mon site moi-même ?',
      answer:
        'On le décide ensemble au devis. Pour ce qui change souvent, comme les horaires, la carte ou les photos, je peux prévoir un espace simple pour le faire vous-même. Sinon, je fais les modifications pour vous.',
    },
    {
      question: 'Mon entreprise n’est pas à Paris. Est-ce un problème ?',
      answer:
        'Non. Je travaille surtout avec des entreprises de Paris et d’Île-de-France, comme Meme Rina à Chatou. Tout peut aussi se faire à distance, par téléphone et en visio.',
    },
  ],
  cta: {
    title: 'Parlons de votre site.',
    text: 'Décrivez votre activité en quelques lignes. Je vous réponds avec quelques questions précises, puis un devis.',
  },
  schema: {
    type: 'service',
    serviceType: 'Création de site internet',
    area: ['Paris', 'Île-de-France'],
    offers: ['website', 'maintenance'],
  },
})
