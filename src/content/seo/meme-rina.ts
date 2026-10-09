// Étude de cas /realisations/meme-rina/ : le site de la pizzeria Meme Rina à Chatou (projet client,
// https://www.memerina.fr/). Recherches visées : « site internet pizzeria », « site restaurant Chatou »,
// « création site restaurant Yvelines ».
//
// Sources : la fiche du projet (projects.ts : stack, lien, année ; fr.ts : description) et le site en ligne,
// relu le 2026-10-09 (sections, pages, liens de commande, infos pratiques). Rien d'autre : aucun chiffre,
// aucune citation, aucun résultat mesuré.
//
// À COMPLÉTER PAR MATHIS (rien n'est publié tant que ce n'est pas vérifié ; à ajouter dans « Résultat ») :
//   - date de mise en ligne et durée du projet ;
//   - situation de départ : ancien site ? seulement une fiche Google ? demande initiale du client ;
//   - effet mesuré, s'il existe : réservations ou appels par mois avant / après, clics vers Uber Eats et
//     Deliveroo, position sur « pizzeria Chatou » ;
//   - un mot du client, avec son accord écrit pour le publier.
// À VÉRIFIER PAR MATHIS :
//   - « Besoin » est déduit de ce que le site contient : à confirmer ou corriger avec la vraie demande ;
//   - le nom s'écrit « Mémé Rina » sur le site du client, « Meme Rina » dans le portfolio ;
//   - le pied de page du site client indique OVHcloud comme hébergeur, projects.ts indique Netlify ;
//   - FAQ : carte modifiable par le client, réservation branchée sur un outil existant.
import { typesetFrench } from '../../lib/typography'
import { projects } from '../projects'
import { priceText } from './prices'
import { siteSteps } from './shared'
import type { Landing } from './types'

const project = projects.find((p) => p.slug === 'meme-rina')
if (!project?.links.site) throw new Error('[seo] projet meme-rina introuvable ou sans lien')

export const memeRina: Landing = typesetFrench<Landing>({
  meta: {
    title: 'Site de la pizzeria Meme Rina à Chatou · Mathis Boulais',
    description:
      'Étude de cas : le site de Meme Rina, pizzeria de quartier à Chatou. La carte, la réservation, la commande et les infos pratiques à un geste de l’accueil.',
  },
  kicker: 'Étude de cas · Restaurant · Chatou, Yvelines',
  title: 'Meme Rina, le site d’une pizzeria de quartier à Chatou',
  intro:
    'Meme Rina est une pizzeria de quartier à Chatou, à l’ouest de Paris. J’ai conçu et développé son site : la carte, la réservation, la commande et les infos pratiques, à un geste de la page d’accueil.',
  facts: [
    { label: 'Client', value: 'Pizzeria de quartier, Chatou (78)' },
    { label: 'Technologies', value: project.stack.join(' / ') },
    { label: 'Site', value: { url: project.links.site } },
  ],
  visual: { model: 'pizza', alt: 'Part de pizza margherita, un filament de mozzarella s’étire' },
  parent: { name: 'Réalisations', href: '/#work' },
  blocks: [
    {
      type: 'text',
      label: 'Situation',
      title: 'Une pizzeria de quartier, près de la gare',
      paragraphs: [
        'Meme Rina sert des pizzas et des panuozzi à Chatou, près de la gare de Chatou-Croissy. On y mange sur place, on emporte, on se fait livrer.',
        'La pizzeria s’adresse à Chatou et aux communes voisines : Croissy-sur-Seine, Le Vésinet, Carrières-sur-Seine.',
      ],
    },
    {
      type: 'text',
      label: 'Besoin',
      title: 'Répondre aux questions avant l’appel',
      paragraphs: [
        'Avant de venir ou de commander, un client veut savoir ce qu’il y a à la carte, s’il reste de la place, s’il peut se faire livrer et où se garer.',
        'Le site devait y répondre vite, sur téléphone, et mener à la bonne action : réserver, commander ou appeler.',
      ],
    },
    {
      type: 'terms',
      label: 'Réalisation',
      title: 'Ce que contient le site',
      items: [
        {
          term: 'La carte',
          text: 'Les pizzas signatures et les panuozzi dès l’accueil, la carte complète sur sa propre page, une page pour les allergènes.',
        },
        {
          term: 'La réservation',
          text: 'Une page pour réserver une table, et le téléphone pour les grandes tablées.',
        },
        {
          term: 'La commande',
          text: 'La livraison passe par Uber Eats et Deliveroo, la vente à emporter par téléphone. Le site mène à chacun en un geste.',
        },
        {
          term: 'Les avis',
          text: 'Les avis clients mis en avant, avec un lien pour lire la fiche Google et laisser un avis.',
        },
        {
          term: 'Les infos pratiques',
          text: 'Adresse, itinéraire, stationnement, accès pour les personnes à mobilité réduite, et une page de questions fréquentes.',
        },
        {
          term: 'Le quartier',
          text: 'Une section qui nomme Chatou et les communes voisines, pour que les recherches du coin mènent au site.',
        },
      ],
    },
    {
      type: 'text',
      label: 'Résultat',
      title: 'Tout est à un geste de l’accueil',
      paragraphs: [
        'Le site est en ligne sur memerina.fr. Depuis la page d’accueil, un visiteur voit la carte, réserve, commande ou lance l’itinéraire.',
        'Les questions qui reviennent ont leur réponse écrite : stationnement, allergènes, grandes tablées, ouverture du dimanche soir.',
      ],
    },
    {
      type: 'pricing',
      label: 'Prix',
      title: 'Un site comme celui-ci',
      items: [
        {
          service: 'website',
          text: 'Le point de départ d’un site de restaurant sur mesure. Le devis précise ce qui s’ajoute : carte complète, réservation, pages d’informations.',
        },
        {
          service: 'maintenance',
          text: 'En option, pour garder le site à jour : mises à jour, sauvegardes, surveillance.',
        },
      ],
      note: 'Chaque devis est écrit et détaillé avant tout travail.',
    },
    {
      type: 'steps',
      label: 'Méthode',
      title: 'La même méthode pour votre commerce',
      steps: siteSteps,
    },
    {
      type: 'examples',
      label: 'Autres projets',
      title: 'D’autres réalisations',
      items: [
        {
          project: 'wegir',
          text: 'Mon application de navigation en convoi, publiée sur l’App Store.',
        },
        {
          project: 'fitness',
          text: 'Une application de coaching sportif pour iPhone et Android, en développement.',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Combien coûte un site comme celui de Meme Rina ?',
      answer: `Un site vitrine sur mesure coûte ${priceText('website')}. Le prix dépend des pages et des fonctions : carte complète, réservation, liens de commande, pages d’informations. Vous recevez un devis écrit avant tout travail.`,
    },
    {
      question: 'Le site peut-il prendre les commandes en livraison ?',
      answer:
        'Oui, de deux façons. Comme chez Meme Rina, il peut mener vers vos plateformes de livraison, comme Uber Eats ou Deliveroo. Il peut aussi prendre les commandes lui-même, avec paiement en ligne : c’est chiffré à part.',
    },
    {
      question: 'Peut-on réserver une table depuis le site ?',
      answer:
        'Oui. Chez Meme Rina, la réservation se fait sur une page dédiée, et par téléphone pour les grandes tablées. Je l’adapte à votre façon de gérer la salle : formulaire, outil de réservation que vous utilisez déjà, ou simple bouton d’appel.',
    },
    {
      question: 'Comment tenir la carte à jour ?',
      answer:
        'On le décide au devis. La carte peut se modifier depuis un espace simple, ou je m’en charge dans le cadre de la maintenance.',
    },
    {
      question: 'Mon restaurant n’est pas à Paris. Est-ce un problème ?',
      answer:
        'Non. Meme Rina est à Chatou, dans les Yvelines. Je travaille avec des commerces de Paris et de toute l’Île-de-France, par téléphone et en visio.',
    },
  ],
  cta: {
    title: 'Parlons de votre commerce.',
    text: 'Un restaurant, une boutique, un atelier ? Décrivez-le en quelques lignes. Je vous réponds pour en parler.',
  },
  schema: {
    type: 'case',
    project: 'meme-rina',
    // Tels qu'indiqués sur le site du client (adresse : Chatou, 78400)
    client: { name: 'Meme Rina', locality: 'Chatou', postalCode: '78400' },
  },
})
