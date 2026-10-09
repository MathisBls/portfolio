// Page d'atterrissage /application-mobile-sur-mesure/ : applications iOS et Android, appuyée sur deux
// projets réels (Wegir, publiée ; l'application de coaching sportif, en développement). Recherches visées :
// « application mobile sur mesure », « création application iOS Android Paris ». Prix : « Sur devis »
// (services.ts, app). Aucun chiffre inventé.
// Validé par Mathis le 2026-10-09 : comptes développeur Apple et Google au nom du client ; versions de test sur le
// téléphone du client pendant le développement ; back-office ; devis « fonction par fonction ».
import { typesetFrench } from '../../lib/typography'
import type { Landing } from './types'

export const mobileApp: Landing = typesetFrench<Landing>({
  meta: {
    title: 'Application mobile sur mesure, iOS et Android · Mathis Boulais',
    description:
      'Création d’application mobile sur mesure pour iPhone et Android, près de Paris : cadrage, maquettes, développement, publication sur l’App Store et Google Play.',
  },
  kicker: 'iOS et Android · Paris et Île-de-France',
  title: 'Application mobile sur mesure, pour iPhone et Android',
  intro:
    'Je conçois et je développe des applications mobiles, de la première maquette à la publication sur l’App Store et Google Play. Une seule base de code pour les deux plateformes, et c’est moi que vous appelez.',
  facts: [
    { label: 'Prix', value: { service: 'app' } },
    { label: 'Plateformes', value: 'iOS et Android, une seule base de code' },
    { label: 'Déjà publiée', value: 'Wegir, sur l’App Store' },
  ],
  visual: {
    model: 'smartphone',
    alt: 'Smartphone vu de trois quarts, les calques de son interface écartés au-dessus de l’écran',
  },
  blocks: [
    {
      type: 'terms',
      label: 'Pour qui',
      title: 'Trois cas où une application a du sens',
      items: [
        {
          term: 'Une appli pour vos clients',
          text: 'Réservation, fidélité, commande, suivi d’un service. Vos clients l’ont sur leur écran d’accueil et reçoivent vos notifications.',
        },
        {
          term: 'Un outil pour vos équipes',
          text: 'Planning, interventions, bons de livraison, photos de chantier. Une application faite pour votre façon de travailler.',
        },
        {
          term: 'Un produit à lancer',
          text: 'Une première version assez solide pour vos premiers utilisateurs, assez simple pour sortir vite.',
        },
      ],
    },
    {
      type: 'terms',
      label: 'Inclus',
      title: 'Ce que je prends en charge',
      items: [
        {
          term: 'Cadrage et maquettes',
          text: 'La liste des écrans et des fonctions, puis des maquettes que vous validez avant le développement.',
        },
        {
          term: 'iPhone et Android en même temps',
          text: 'Développement en React Native avec Expo : une seule base de code, deux applications.',
        },
        {
          term: 'Comptes, paiements, notifications',
          text: 'Connexion des utilisateurs, abonnements ou achats intégrés, notifications.',
        },
        {
          term: 'Le serveur et les données',
          text: 'Le serveur et la base de données derrière l’application, et un espace d’administration si vous devez gérer du contenu.',
        },
        {
          term: 'La publication',
          text: 'Les fiches App Store et Google Play, les captures d’écran, la validation par Apple et Google.',
        },
        {
          term: 'Un code qui vous appartient',
          text: 'Code documenté, livré avec tous les accès à la fin du projet.',
        },
      ],
    },
    {
      type: 'pricing',
      label: 'Prix',
      title: 'Un devis après le cadrage',
      items: [
        {
          service: 'app',
          text: 'Le prix dépend du nombre d’écrans, des comptes utilisateurs, des paiements et du serveur. Après un premier échange, vous recevez un devis détaillé, fonction par fonction.',
        },
        {
          service: 'maintenance',
          text: 'Après la sortie : mises à jour pour les nouvelles versions d’iOS et d’Android, corrections, surveillance.',
        },
      ],
      note: 'Une application web coûte souvent moins cher. Si elle suffit, je vous le dis.',
    },
    {
      type: 'steps',
      label: 'Méthode',
      title: 'De l’idée à l’App Store',
      steps: [
        {
          term: 'Cadrage',
          text: 'Ce que l’application doit faire, pour qui, et ce qui peut attendre une deuxième version.',
        },
        {
          term: 'Maquettes',
          text: 'Les écrans principaux, dessinés et validés avec vous avant le développement.',
        },
        {
          term: 'Développement par étapes',
          text: 'Vous installez les versions de test sur votre téléphone et vous suivez l’avancement.',
        },
        {
          term: 'Publication et suivi',
          text: 'Je publie sur l’App Store et Google Play, puis je suis les premiers retours et les mises à jour.',
        },
      ],
    },
    {
      type: 'examples',
      label: 'Exemples',
      title: 'Deux applications que j’ai construites',
      items: [
        {
          project: 'wegir',
          text: 'Navigation GPS en convoi : itinéraire partagé, positions en direct, talkie-walkie, alertes. Publiée sur l’App Store, avec sa version web.',
        },
        {
          project: 'fitness',
          text: 'Coaching sportif, en développement : programmes d’entraînement, suivi nutritionnel, courbes de progression, abonnement premium sur l’App Store et Google Play.',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Faut-il développer deux applications, une pour iPhone et une pour Android ?',
      answer:
        'Non. Avec React Native, une seule base de code donne une application iOS et une application Android. C’est ce que j’utilise pour Wegir et pour l’application de coaching sportif.',
    },
    {
      question: 'Combien coûte une application mobile ?',
      answer:
        'Il n’y a pas de prix unique : tout dépend des écrans, des comptes, des paiements et du serveur. Après un premier échange, je vous envoie un devis détaillé. Si une version plus simple suffit pour démarrer, je vous la propose.',
    },
    {
      question: 'Une application web ne suffirait-elle pas ?',
      answer:
        'Parfois, oui. Si vos clients n’ont besoin ni de notifications, ni du GPS, ni d’une icône sur leur téléphone, une application web coûte moins cher et se met à jour sans passer par les stores. Je vous le dis dès le premier échange.',
    },
    {
      question: 'Qui s’occupe de la publication sur l’App Store et Google Play ?',
      answer:
        'Moi. Je prépare les fiches et les captures d’écran, et je suis la validation d’Apple et de Google. Les comptes développeur sont à votre nom : l’application vous appartient.',
    },
    {
      question: 'L’application peut-elle vendre des abonnements ?',
      answer:
        'Oui. Abonnements et achats intégrés passent par l’App Store et Google Play. L’application de coaching sportif fonctionne ainsi, avec une offre premium.',
    },
    {
      question: 'À qui appartient le code ?',
      answer:
        'À vous. Le code est documenté et livré avec tous les accès. Vous pouvez le confier à quelqu’un d’autre si vous le souhaitez.',
    },
  ],
  cta: {
    title: 'Parlons de votre application.',
    text: 'Décrivez l’idée en quelques lignes : à qui elle sert, ce qu’elle doit faire. Je reviens vers vous avec quelques questions, puis un devis.',
  },
  schema: {
    type: 'service',
    serviceType: 'Développement d’application mobile',
    area: ['Paris', 'Île-de-France'],
    offers: ['app', 'maintenance'],
  },
})
