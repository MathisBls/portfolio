// Page d'atterrissage /site-internet-artisan/ : artisans du bâtiment et des métiers de bouche, en
// Île-de-France. Recherches visées : « site internet artisan », « création site artisan Île-de-France »,
// « site internet plombier / boulangerie ». Prix repris de services.ts (prices.ts). Aucun chiffre inventé.
// Validé par Mathis le 2026-10-09 : rédaction des textes par Mathis à partir d'un appel (méthode, FAQ) ; demande de
// devis avec photo jointe ; maquette consultable sur téléphone avant la mise en ligne.
import { typesetFrench } from '../../lib/typography'
import { priceText } from './prices'
import type { Landing } from './types'

export const artisan: Landing = typesetFrench<Landing>({
  meta: {
    title: 'Site internet pour artisan en Île-de-France · Mathis Boulais',
    description: `Site internet pour artisans du bâtiment et métiers de bouche en Île-de-France : vos réalisations, votre zone, un appel en un geste. Site ${priceText('website')}.`,
  },
  kicker: 'Île-de-France · Bâtiment et métiers de bouche',
  title: 'Site internet pour artisan, du bâtiment aux métiers de bouche, en Île-de-France',
  intro:
    'Vos clients vous cherchent sur leur téléphone, souvent dans l’urgence ou juste avant de passer. Je crée des sites simples et rapides qui montrent votre travail et permettent de vous appeler en un geste.',
  facts: [
    { label: 'Site d’artisan', value: { service: 'website' } },
    { label: 'Zone', value: 'Paris et toute l’Île-de-France' },
    { label: 'Métiers', value: 'Bâtiment et métiers de bouche' },
  ],
  visual: { model: 'etabli', alt: 'Établi d’artisan en bois, ses outils posés dessus' },
  blocks: [
    {
      type: 'terms',
      label: 'Pour qui',
      title: 'Deux familles de métiers, deux façons d’être cherché',
      items: [
        {
          term: 'Métiers du bâtiment',
          text: 'Plombier, électricien, chauffagiste, menuisier, peintre, maçon, couvreur. On vous cherche pour un dépannage ou pour un devis : il faut vous trouver, vous croire, vous joindre.',
        },
        {
          term: 'Métiers de bouche',
          text: 'Boulanger, boucher, traiteur, pizzeria, restaurant. On vous cherche pour savoir si vous êtes ouvert, ce que vous proposez et comment commander.',
        },
      ],
    },
    {
      type: 'terms',
      label: 'Inclus',
      title: 'Ce qu’un site d’artisan doit montrer',
      items: [
        {
          term: 'Votre numéro, partout',
          text: 'Un bouton d’appel toujours visible sur téléphone. C’est souvent le seul geste que fait le client.',
        },
        {
          term: 'Vos réalisations',
          text: 'Des photos de chantiers ou de produits, rangées par type de travaux. Vos photos de téléphone suffisent souvent.',
        },
        {
          term: 'Votre zone d’intervention',
          text: 'Les villes et les arrondissements où vous intervenez, écrits en toutes lettres pour Google.',
        },
        {
          term: 'La demande de devis',
          text: 'Un formulaire court : le type de travaux, la ville, une photo si besoin. La demande arrive dans votre boîte mail.',
        },
        {
          term: 'Pour les métiers de bouche',
          text: 'La carte ou les produits, les horaires, la commande ou la réservation, comme sur le site de Meme Rina.',
        },
        {
          term: 'Votre fiche Google, reliée',
          text: 'Vos avis Google mis en avant. La fiche Google Business Profile et le site renvoient l’un vers l’autre.',
        },
      ],
    },
    {
      type: 'pricing',
      label: 'Prix',
      title: 'Un prix clair, sans abonnement imposé',
      items: [
        {
          service: 'website',
          text: 'Un site d’artisan sur mesure, en ligne avec votre nom de domaine et une adresse email pro.',
        },
        {
          service: 'maintenance',
          text: 'En option : mises à jour, sauvegardes, surveillance. Réponse sous 24 h.',
        },
      ],
      note: 'Le devis est écrit et se paie une fois. La maintenance n’est jamais obligatoire.',
    },
    {
      type: 'steps',
      label: 'Méthode',
      title: 'Pensé pour quelqu’un qui passe ses journées sur les chantiers',
      steps: [
        {
          term: 'Un appel pour commencer',
          text: 'Vous m’expliquez votre métier, votre secteur et le type de clients que vous voulez. Je prends les notes.',
        },
        {
          term: 'Je rédige, vous relisez',
          text: 'Je prépare les textes et la structure à partir de notre échange. Vous corrigez ce qui ne vous ressemble pas.',
        },
        {
          term: 'Vous validez sur votre téléphone',
          text: 'Vous voyez le site sur votre téléphone avant qu’il soit en ligne.',
        },
        {
          term: 'Mise en ligne',
          text: 'Nom de domaine, adresse email pro, fiche Google reliée. Le site est à vous.',
        },
      ],
    },
    {
      type: 'examples',
      label: 'Exemple',
      title: 'Un commerce de bouche, déjà en ligne',
      items: [
        {
          project: 'meme-rina',
          text: 'Pizzeria de quartier à Chatou, dans les Yvelines : la carte, la réservation, la commande et les avis Google, depuis la page d’accueil.',
          caseStudy: 'meme-rina',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Je n’ai pas le temps de m’occuper d’un site. Comment ça se passe ?',
      answer:
        'Un appel et quelques photos suffisent pour démarrer. Je prépare le reste : textes, structure, mise en page. Vous relisez, vous validez, c’est tout.',
    },
    {
      question: 'Je n’ai pas de belles photos de mes chantiers.',
      answer:
        'Les photos prises au téléphone suffisent souvent : je les recadre et je les allège pour le web. On peut aussi commencer avec peu et ajouter vos chantiers au fil du temps.',
    },
    {
      question: 'J’ai déjà une fiche Google. Pourquoi un site ?',
      answer:
        'La fiche vous fait trouver. Le site convainc : il montre vos réalisations, explique vos services et répond aux questions avant l’appel. Reliés, l’un renvoie vers l’autre.',
    },
    {
      question: 'Un site va-t-il vraiment m’apporter des clients ?',
      answer:
        'Un site seul ne remplit pas un carnet de commandes. Il rassure ceux qui vous ont trouvé par Google ou par le bouche-à-oreille, et leur donne un moyen simple de vous appeler ou de demander un devis.',
    },
    {
      question: 'Combien coûte un site internet pour un artisan ?',
      answer: `Un site d’artisan coûte ${priceText('website')}. Le prix dépend du nombre de pages et des fonctions, comme la demande de devis avec photo ou la commande en ligne. Le devis est écrit et détaillé avant tout travail.`,
    },
    {
      question: 'Travaillez-vous en dehors de Paris ?',
      answer:
        'Oui, dans toute l’Île-de-France. Meme Rina, par exemple, est à Chatou, dans les Yvelines. Le reste se fait par téléphone et en visio.',
    },
  ],
  cta: {
    title: 'Parlons de votre métier.',
    text: 'Dites-moi ce que vous faites et où vous intervenez. Je vous réponds pour en parler.',
  },
  schema: {
    type: 'service',
    serviceType: 'Création de site internet pour artisan',
    area: ['Île-de-France'],
    offers: ['website', 'maintenance'],
  },
})
