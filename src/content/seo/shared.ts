// Blocs communs à plusieurs pages d'atterrissage (texte brut : chaque page applique typesetFrench).
import type { Term } from './types'

/**
 * Méthode d'un site vitrine, en 4 étapes (création de site à Paris, étude de cas). Validé par Mathis le
 * 2026-10-09 : pas de rendez-vous en personne (téléphone et visio seulement) ; adresse de test pendant le
 * développement, espace pour modifier ses textes et comptes des stores au nom du client : oui.
 */
export const siteSteps: [Term, Term, Term, Term] = [
  {
    term: 'Un premier échange',
    text: 'Vous me parlez de votre activité et de vos clients, par téléphone ou en visio.',
  },
  {
    term: 'Un devis clair',
    text: 'Ce qui est inclus, le prix, le délai. Vous savez où vous allez avant de vous engager.',
  },
  {
    term: 'La maquette, puis le code',
    text: 'Vous validez la maquette avant que j’écrive la première ligne de code. Ensuite, vous suivez l’avancement sur une adresse de test.',
  },
  {
    term: 'Mise en ligne et suivi',
    text: 'Le site part en ligne avec votre nom de domaine. Je reste joignable pour la suite.',
  },
]
