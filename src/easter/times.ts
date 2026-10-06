// Easter egg : repères de temps de la séquence (secondes), partagés par la timeline, la caméra et la
// route. Retours de Mathis du 2026-10-06 : 5 s de zoom sur le prisme avant l'éclatement (tout le reste
// décalé de 5.5 s), puis la route avec le message au lieu du vol sur le B.

/** Séquence complète. */
export const T = {
  /** Zoom lent sur le prisme intact (tension), puis une demi-seconde suspendue, puis l'éclatement. */
  zoom: 0,
  hush: 5,
  shatter: 5.5,
  arena: 7,
  deal: 12.5,
  flips: [14.8, 16] as const,
  charge: 17.1,
  legendary: 17.8,
  lift: 19.4,
  approach: 19.8,
  turn: 20,
  dive: 20.9,
  /** Bascule du dos de la carte vers la route (fondu rose). */
  road: 21.8,
  /** Les trois lignes du message (site.easter.lines), chacune remplace la précédente. */
  lines: [22.5, 25.8, 28.4] as const,
  climax: 31.5,
  impact: 32,
  finale: 34.5,
} as const

/** Reduced-motion : fondus seulement, route immobile, message affiché d'un bloc. */
export const R = {
  sky: 1.4,
  arena: 2,
  cards: 3.8,
  out: 9.2,
  road: 10.1,
  lines: [11, 13.8, 16.6] as const,
  away: 19.4,
  finale: 20.3,
  end: 22,
} as const
