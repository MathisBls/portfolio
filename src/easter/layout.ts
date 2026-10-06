// Easter egg : mise en place dans le monde (constantes partagées par la caméra et les objets).
// Mesures des GLB (public/models/easter/) : arena.glb, table B_field 18.8 × 9.1 (x ±9.4, z ±4.55),
// dessus à y 0.42 ; deck du joueur B_deck_player_* en (12, 0.55 -> 0.97, 2.6), cartes du deck 1.2 × 1.7.
// cards.glb : cartes 2.6 × 3.7 (cadre), debout dans le plan XY, face avant +Z, dos −Z ; dos du B
// (*_back_logo) en (0, 0.2, −0.15) local. b_logo.glb : B 1.16 × 1.75 × 0.05, lisible depuis −Z.
import { Matrix4, Quaternion, Vector3 } from 'three'

type V3 = readonly [number, number, number]

/** Beat 1 : le prisme éclate haut dans le ciel, au-dessus de l'arène (hors champ). */
export const SKY_Y = 34
export const SKY_CAMERA: V3 = [0, SKY_Y, 8.5]

/** Dessus de la table (B_field). */
export const TABLE_Y = 0.42
/** Cartes posées : COMMON, RARE, LEGENDARY, de gauche à droite (vues depuis le joueur, +z). */
export const SLOTS: readonly V3[] = [
  [-3.5, TABLE_Y, 0.7],
  [0, TABLE_Y, 0.7],
  [3.5, TABLE_Y, 0.7],
]
/** Sommet du deck du joueur : les cartes en partent à l'échelle des cartes du deck. */
export const DECK: V3 = [12.05, 1.02, 2.55]
export const DECK_SCALE = 0.46
/** Demi-épaisseur utile d'une carte couchée (dos à −0.18, ornements à +0.25 en local). */
export const CARD_LIFT = 0.2

/** Beat 4 : la légendaire levée, debout, dos (et B) face à la caméra. */
export const STAND: V3 = [3.5, 3.3, 1.4]

/** Beat 6 : le B géant du final, centré à l'origine (l'arène et la route sont alors masquées). */
export const GIANT_SCALE = 30
/** Beat 6 : caméra du final, devant la face lisible (−Z) du B géant. */
export const FINALE_CAMERA: V3 = [0, 0, -125]

/**
 * Repère monde du B au dos de la légendaire une fois levée et retournée (carte debout en STAND, demi-tour
 * sur Y). Écrit par Cards.tsx à partir de la matrice locale du nœud legendary_back_logo.
 */
export const LOGO_FRAME = new Matrix4()

export function setLogoFrame(logoLocal: Matrix4): void {
  const card = new Matrix4().compose(
    new Vector3(...STAND),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
    new Vector3(1, 1, 1),
  )
  LOGO_FRAME.multiplyMatrices(card, logoLocal)
}
