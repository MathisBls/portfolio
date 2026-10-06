// Easter egg v3, beat 8 (docs/storyboards/easter-park.md, « Le parc, tableaux dans l'ordre ») : mise en
// place du parc, en calcul pur (partagée par la caméra, la timeline et les objets). Repère local du parc :
// le groupe racine est posé en PARK_ORIGIN, loin de tout le reste de la séquence (arène, route et étoiles
// d'Atmosphere autour de l'origine), au-delà du plan lointain : rien d'autre ne peut entrer dans le champ.
// On vole globalement vers −Z : porte, allée des écrans, géante gazeuse et son rail, lune et grande roue,
// planète des cartes, puis le B monumental où la caméra s'arrête (beat 9).

export type V3 = readonly [number, number, number]

/** Origine du parc dans le monde (unités). */
export const PARK_ORIGIN: V3 = [0, 0, -10000]

/** Plan lointain pendant le parc (les planètes sont à plus de 1000 unités au départ). */
export const PARK_FAR = 6000

/** Direction vers le soleil (monde), un peu à droite et devant : terminateurs et croissants visibles. */
export const SUN_DIR: V3 = [0.62, 0.34, -0.71]

/** Repères de temps du parc (s depuis le début du beat 8). */
export const BEATS = {
  /** Passage de la porte, au sortir de la lumière. */
  gate: 0,
  /** Allée des écrans. */
  alley: 2.5,
  alleyEnd: 15,
  /** Planète des montagnes russes : plongée, puis sur le rail. */
  rail: 23,
  railEnd: 33,
  /** Lune et grande roue (passage entre la lune et la jante). */
  wheel: 40,
  /** Planète des cartes. */
  cards: 50,
  /** Approche du B, arrêt face à lui. */
  monument: 57,
  stop: 72,
} as const

/** Reduced-motion : durée de chaque plan fixe (fondu au noir compris), le dernier (le B) reste. */
export const STILL_TIME = 5.5

/** Porte du parc (Gate_*) : anneau face à +Z, franchi à BEATS.gate + ≈ 0.8 s. */
export const GATE = { position: [0, 0, 0] as V3, radius: 30 }

/** Allée des écrans : hélice d'écrans autour de l'axe z, qui tourne lentement (carrousel). */
export const ALLEY = {
  from: -70,
  to: -500,
  radius: 40,
  /** Écrans par tour d'hélice. */
  perTurn: 4,
  screens: { desktop: 14, mobile: 8 },
  /** Largeur d'un écran (16:9). */
  width: 28,
  /** Cerceaux néon qui dessinent le couloir : nombre, rayon, premier et dernier z. */
  hoops: { desktop: 9, mobile: 5, radius: 58, from: -30, to: -520 },
  /** Inclinaison vers la caméra qui arrive (rad). */
  tilt: 0.45,
  /** Vitesse du carrousel (rad/s). */
  spin: 0.14,
} as const

/** Géante gazeuse des montagnes russes : centre, rayon, inclinaison (équateur, anneaux et rail). */
export const GIANT = {
  center: [-170, -40, -1200] as V3,
  radius: 230,
  /** Euler 'YXZ' (rad) : on voit le dessus des anneaux depuis l'allée. */
  tilt: [0.3, 0.5, -0.2] as V3,
  ring: { inner: 330, outer: 560 },
  /** Rotation propre (rad/s), lente. */
  spin: 0.006,
}

/** Rail des montagnes russes : boucle fermée autour de la géante, entre sa surface et ses anneaux. */
export const RAIL = {
  radius: 276,
  /** Ondulations verticales sur un tour et leur amplitude. */
  waves: 3,
  rise: 40,
  /** Rails de guidage (écart au rail porteur), hauteur de la caméra au-dessus de la voie. */
  gauge: 1.05,
  ride: 4.4,
  /** Échelle des wagons (Coaster_Car : 3.4 m de long, rail porteur sur son axe). */
  carScale: 1.3,
  /** Tronçon suivi par la caméra (angles sur la boucle) : entrée dans l'axe d'arrivée. */
  enter: 2.95,
  exit: 4.95,
  /** Trains de wagons : nombre, wagons par train, vitesse angulaire (rad/s), écart entre wagons (rad). */
  trains: 3,
  cars: 6,
  speed: 0.27,
  spacing: 0.032,
}

/** Lune rocheuse et grande roue qui tourne autour d'elle. */
export const MOON = { center: [-12, 40, -1754] as V3, radius: 62 }
export const WHEEL = {
  /** Rayon de la jante (accroche des cabines) ; la roue est centrée sur la lune. */
  radius: 125,
  cabins: { desktop: 18, mobile: 12 },
  /** Lacet du plan de la roue (rad) : on la traverse dans l'axe du vol, vers la planète des cartes. */
  yaw: -0.6435,
  spin: 0.05,
}

/** Planète des cartes : cartes BoulardTV en orbite, la légendaire en géant. */
export const CARD_PLANET = {
  center: [-270, 120, -2380] as V3,
  radius: 92,
  orbits: [
    { radius: 150, tilt: 0.35, phase: 0, speed: 0.07 },
    { radius: 182, tilt: -0.5, phase: 1.3, speed: -0.055 },
    { radius: 214, tilt: 1.05, phase: 2.4, speed: 0.045 },
  ],
  perOrbit: { desktop: 5, mobile: 3 },
  /** Taille d'une carte satellite et de la légendaire géante (facteur sur cards.glb, 2.6 × 3.7). */
  cardScale: 7,
  legendScale: 26,
}

/** La légendaire géante flotte devant la planète des cartes, du côté de la caméra (décalage local). */
export const LEGEND_OFFSET: V3 = [125, 10, 125]

/** Le B monumental (b_logo.glb, 1.75 de haut), au centre du parc, face à la caméra qui arrive. */
export const MONUMENT = {
  center: [40, 230, -2990] as V3,
  scale: 80,
  /** Caméra du final : distance devant la face lisible, et décalage vertical du regard. */
  distance: 300,
}

/** Fenêtres de visibilité et de mise à jour des tableaux (s du parc). */
export const WINDOWS = {
  gate: [0, 7],
  alley: [0, 22],
  giant: [0, 50],
  wheel: [12, 58],
  cards: [24, Infinity],
  monument: [36, Infinity],
} as const

export function within(window: readonly [number, number], t: number): boolean {
  return t >= window[0] && t <= window[1]
}
