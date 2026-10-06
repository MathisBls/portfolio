// Easter egg : mise en place dans le monde (constantes partagées par la caméra et les objets).
// Mesures des GLB (public/models/easter/) : arena.glb (salon de jeu, scripts/blender/model_easter_arena.py,
// dont les cotes reprennent celles-ci) : table en stade, tapis de rayon 4.6 autour de deux centres en
// x = ±5 (x ±9.6, z ±4.6), dessus à y 0.42 ; trois emplacements de 2.95 × 4.05 (liseré d'or) centrés en
// z 1.55 ; médaillon du B en (0, -2.35) ; sabot du paquet en (7.6, 1.4), pile de cartes jusqu'à y 0.78 ;
// sol de la salle à y -5.6. cards.glb : cartes 2.6 × 3.7 (cadre), debout dans le plan XY, face avant +Z,
// dos −Z ; dos du B (*_back_logo) en (0, 0.2, −0.15) local. b_logo.glb : B 1.16 × 1.75 × 0.05, lisible
// depuis −Z.
import { Matrix4, Quaternion, Vector3 } from 'three'

type V3 = readonly [number, number, number]

/** Beat 1 : le prisme éclate haut dans le ciel, au-dessus de l'arène (hors champ). */
export const SKY_Y = 34
export const SKY_CAMERA: V3 = [0, SKY_Y, 8.5]

/** Dessus du tapis de la table. */
export const TABLE_Y = 0.42
/** Sol de la salle (marbre, miroir sur desktop). */
export const FLOOR_Y = -5.6
/** Cartes posées : COMMON, RARE, LEGENDARY, de gauche à droite (vues depuis le joueur, +z). */
export const SLOTS: readonly V3[] = [
  [-3.6, TABLE_Y, 1.55],
  [0, TABLE_Y, 1.55],
  [3.6, TABLE_Y, 1.55],
]
/** Sommet du paquet, dans le sabot (pile à y 0.78) : les cartes en partent à l'échelle du paquet. */
export const DECK: V3 = [7.6, 0.875, 1.4]
export const DECK_SCALE = 0.46
/** Demi-épaisseur utile d'une carte couchée (dos à −0.18, ornements à +0.25 en local). */
export const CARD_LIFT = 0.2

/** Beat 4 : la légendaire levée, debout, dos (et B) face à la caméra. */
export const STAND: V3 = [3.6, 3.3, 2.25]

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
