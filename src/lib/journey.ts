// Fenêtres des progress de section après le hero, source unique pour le prisme (Prism.tsx) :
// - docs/storyboards/projects.md §2 : projects 0.1 « Le groupe du prisme monte (y 0 → +3.4,
//   projects 0 → 0.15) » ; 0.2–0.9 « son rayon se réoriente vers l'objet ». Retour de Mathis : pendant
//   les projets, seul le rayon actif reste, les autres se rétractent dans le prisme (fanOutT).
// - docs/storyboards/services-contact.md §2 : 2.3 « Les rayons se rétractent vers le prisme (longueur → 0,
//   services 0 → 0.4) » ; 3.0 « Le prisme redescend au centre (y +3.4 → 0), rotation z −π/2 → 0
//   (contact 0 → 0.5) » ; 3.5 « aucun rayon coloré : lumière blanche seule ».
// - docs/storyboards/about-legal.md §2 : rayons rétractés, prisme hors cadre pendant About.
import { easeInOut, range } from './math'

export const JOURNEY = {
  /** projects : le groupe du prisme monte de riseY, le prisme sort par le haut. */
  rise: [0, 0.15],
  riseY: 3.4,
  /** services : les rayons se rétractent (longueur → 0). */
  retract: [0, 0.4],
  /** contact : le prisme redescend au centre et défait son quart de tour. */
  descend: [0, 0.5],
  /** projects : l'éventail du hero rentre dans le prisme, seul le rayon du projet actif en ressort. */
  fanOut: [0, 0.08],
  /** card (project:<slug>) : son rayon vise l'objet une fois entré, le lâche avant sa sortie. */
  focusIn: [0.1, 0.3],
  focusOut: [0.7, 0.9],
} as const

type Window = readonly [number, number]
const inWindow = (p: number, [a, b]: Window) => easeInOut(range(p, a, b))

/** Hauteur du prisme (0 au centre, 1 hors cadre en haut) : monte avec projects, redescend avec contact. */
export const liftT = (projects: number, contact: number) =>
  inWindow(projects, JOURNEY.rise) * (1 - inWindow(contact, JOURNEY.descend))

/** Passage de l'éventail du hero (0) au seul rayon du projet actif (1), définitif après projects 0.08. */
export const fanOutT = (projects: number) => inWindow(projects, JOURNEY.fanOut)

/** Quart de tour défait pendant la descente de Contact (0 : état du hero, 1 : rotation z nulle). */
export const untwistT = (contact: number) => inWindow(contact, JOURNEY.descend)

/** Rétraction des rayons (0 : éventail du hero, 1 : longueur nulle), définitive après Services. */
export const retractT = (services: number) => inWindow(services, JOURNEY.retract)

/** Présence d'un objet projet pour la visée de son rayon (0 hors fenêtre, 1 au cœur de la card). */
export const focusPresence = (p: number) =>
  inWindow(p, JOURNEY.focusIn) * (1 - inWindow(p, JOURNEY.focusOut))
