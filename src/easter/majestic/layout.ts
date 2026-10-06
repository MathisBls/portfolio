// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Contrats ») : mise en place du
// second niveau, en calcul pur, partagée par la caméra, la timeline, les objets de D3 (montagne, chœur,
// prisme) et l'environnement de D4 (sol, fissures, poussière, débris, faisceaux, spectre, nuages).
// Unités : mètres, échelle réelle (montagne de 1200 m). Repère monde : la plaine est le plan y = 0, la
// montagne est centrée sur l'origine, sa face au B regarde +Z. Le vaisseau arrive de +Z (beat 1, du ciel),
// vole au ras du sol vers −Z (beat 2) puis s'arrête devant le futur emplacement de la montagne (beat 3).
// Tout le reste de la séquence (arène, route, espace) est masqué sur ce plan (E.shot = SHOT.majestic),
// et le parc est loin (z −10 000).
// Rien ici ne dépend du temps : la timeline et les repères sont dans times.ts.

export type V3 = readonly [number, number, number]

/**
 * Plans de découpe de la caméra sur ce plan. Near relevé (0.1 ailleurs) : la précision de profondeur
 * dépend surtout de near (≈ z² / (near · 2^24) en 24 bits, soit ≈ 1.8 m à 3 km au lieu de 5 m) ;
 * rien du cockpit visible ne passe sous 0.3 m de l'œil (tableau de bord à ≈ 0.42 m, écrans à 0.48 m).
 */
export const MAJESTIC_NEAR = 0.3
export const MAJESTIC_FAR = 60000

/** Plaine : disque de sol, perdu dans la brume bien avant son bord. */
export const PLAIN = { radius: 30000 } as const

/**
 * Brouillard du plan (FogExp2, seul type de la séquence) : densité et couleur de la brume du crépuscule.
 * À 3 km on garde ~90 % du contraste, à 15 km la plaine se fond dans le ciel. D4 peut peindre l'horizon
 * du ciel de la même couleur pour une jonction invisible.
 */
export const MAJESTIC_FOG = { density: 0.000068, color: '#2a1a2e' } as const

/** Direction vers le soleil couchant (normalisée) : bas, derrière la montagne à gauche (contre-jour). */
export const SUN_DIR: V3 = normalize([-0.52, 0.1, -0.85])

/** La montagne (nœuds Mountain et Mountain_B de majestic.glb) : base à y = 0 une fois dressée. */
export const MOUNTAIN = {
  position: [0, 0, 0] as V3,
  /** Hauteur de la pointe (m, haut des coques) et rayon du pied à y = 0 (m, majestic.glb). */
  height: 1200,
  radius: 900,
  /** Profondeur sous la plaine quand M.rise = 0 (entièrement enfouie, sommet compris). */
  sunk: 1260,
  /** Lacet du modèle (rad) : face au B vers +Z. */
  yaw: 0,
} as const

/**
 * Sommet : plateau où se pose le prisme (Summit_Prism, origine à sa base ; joint montagne / coques) et
 * hauteur du prisme (m). `focus` : centre du prisme une fois sorti des coques (il monte de ≈ 34 m),
 * visée des faisceaux du chœur et source du spectre.
 */
export const SUMMIT = {
  position: [0, 1010, 0] as V3,
  prismHeight: 120,
  focus: [0, 1104, 0] as V3,
} as const

/**
 * Le chœur : colosses (Choir_Statue, ≈ 80 m, face +Z) en cercle autour de la montagne, dos à elle : ils
 * chantent vers le monde, visages et mains vers la caméra qui tourne autour d'eux ; leurs faisceaux
 * partent de leurs mains levées vers le sommet, derrière eux.
 */
export const CHOIR = {
  count: { desktop: 12, mobile: 8 },
  /** Rayon du cercle (m), au-delà du pied de la montagne et de son tablier d’éboulis. */
  radius: 1350,
  /** Hauteur d'une statue (m) et hauteur de la lueur (visage, mains) d'où partent les faisceaux. */
  height: 80,
  glowHeight: 64,
  /** Profondeur sous la plaine avant la levée. */
  sunk: 96,
  /**
   * Angle (rad, comme choirAngle) d'où part la vague de la levée : là où se trouve la caméra au début du
   * beat 5 (FLIGHT.retreat) ; les statues les plus proches se lèvent d'abord, la vague fait le tour.
   */
  waveFrom: 1.45,
} as const

/** Nombre de statues du chœur selon le palier. */
export function choirCount(mobile: boolean): number {
  return mobile ? CHOIR.count.mobile : CHOIR.count.desktop
}

/**
 * Angle (rad, depuis +Z, sens trigonométrique vu du dessus) de la statue i : aucune statue pile dans
 * l'axe d'arrivée, pour ne pas masquer le B sculpté.
 */
export function choirAngle(i: number, count: number): number {
  return ((i + 0.5) * Math.PI * 2) / count
}

/**
 * Pied de la statue i (y = 0 une fois levée) et son lacet : la face +Z du modèle tournée vers l'extérieur
 * du cercle (dos à la montagne). `out` reçoit [x, y, z], la fonction renvoie le lacet (rotation.y).
 */
export function choirSlot(i: number, count: number, out: [number, number, number]): number {
  const a = choirAngle(i, count)
  out[0] = MOUNTAIN.position[0] + Math.sin(a) * CHOIR.radius
  out[1] = 0
  out[2] = MOUNTAIN.position[2] + Math.cos(a) * CHOIR.radius
  return a
}

/** Couches de nuages traversées à l'entrée (beat 1) et à la sortie (beat 7), altitudes en m. */
export const CLOUDS = { base: 2600, top: 3400 } as const

/**
 * Trajet du vaisseau, pour placer ce qui doit être vu (débris, poussière, cailloux qui sautillent) :
 * - entry : début du piqué (beat 1), très haut et loin ;
 * - low : altitude du vol au ras de la plaine (beat 2) ;
 * - plain : z de début et de fin du vol bas (le long de x ≈ 0) ;
 * - hold : point où le vaisseau s'arrête pendant le séisme (beat 3), regard vers −Z ;
 * - retreat : fin du recul en arc pendant la montée de la montagne (beat 4), sur le flanc droit (+X),
 *   d'où part l'orbite du chœur (beat 5, sens horaire, vers la face au B).
 */
export const FLIGHT = {
  entry: [0, 5600, 17000] as V3,
  low: 24,
  plain: [9000, 2500] as const,
  hold: [0, 30, 1800] as V3,
  retreat: [2680, 360, 330] as V3,
} as const

/** Zone du séisme (beat 3) : fissures et débris entre le vaisseau et la montagne. */
export const QUAKE_ZONE = { center: [0, 0, 1500] as V3, radius: 1500 } as const

function normalize(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
