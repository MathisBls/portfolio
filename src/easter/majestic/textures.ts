// Easter egg n° 2, « Le Sanctuaire » : textures de public/textures/easter/majestic/ (agent B2), chargées en
// code (convention du projet : GLB sans image, docs/models.md). Générées par
// scripts/blender/model_easter_majestic.py (mode Python système, puis Blender pour les cartes cuites).
//
// Sources Poly Haven, CC0 (crédit dans site.legal.ip.text) : dark_rock_02 (falaise), quarry_wall (éboulis,
// seulement dans la couleur cuite de la montagne), coast_sand_05 (sable, passé en gris volcanique froid),
// rock_surface (pierre sculptée, en niveaux de gris : teinte posée par material.color).
//
// Application (UV du GLB en unités de répétition : le code garde repeat = 1 ; UV glTF, flipY = false) :
// - Mountain et partie rocheuse de Summit_Shell_L/R (matériau MountainRock) : mountainColor (map) et
//   mountainNormal (normalMap EN ESPACE OBJET : material.normalMapType = ObjectSpaceNormalMap). Atlas unique
//   (projection polaire, sommet au centre, pied au bord), sans répétition : ClampToEdge. Rugosité ~0.92.
// - Mountain_B (MountainB), Choir_Statue (ChoirStone), intérieur des coques (SummitInner) : stone*.
// - Rock_A/B/C (RockDebris) : cliff*.
// - Sol de la plaine (D4) : sand*, UV à fournir par le sol (conseil : 1 tuile = 14 m).
// Cartes ARM : R = occlusion, G = rugosité, B = métal (aoMap, roughnessMap, metalnessMap).
// Normales des tuiles au format OpenGL ; avec les UV glTF (sans retournement), inverser le Y de normalScale
// (comme l'arène). WebP ; « -1k » : version mobile des cartes 2K.
// Les textures `tiled` doivent passer en RepeatWrapping (wrapS et wrapT) AVANT leur envoi au GPU
// (gl.initTexture), sinon il faut un needsUpdate (nouvel envoi). Les autres restent en ClampToEdge.
import { type TextureOptions, requestTexture } from '../park/loader'

const DIR = '/textures/easter/majestic/'

const KEYS = [
  'mountainColor',
  'mountainNormal',
  'stoneColor',
  'stoneNormal',
  'stoneArm',
  'cliffColor',
  'cliffNormal',
  'cliffArm',
  'sandColor',
  'sandNormal',
] as const

export type MajesticTextureKey = (typeof KEYS)[number]

type Spec = {
  /** Fichier (sans extension) ; `mobile` : variante 1K quand elle existe. */
  file: string
  mobile?: string
  /** Couleur (sRGB) ou donnée (linéaire). */
  srgb: boolean
  /** Texture répétée (RepeatWrapping) ou atlas unique (ClampToEdgeWrapping). */
  tiled: boolean
}

export const MAJESTIC_TEXTURES: Record<MajesticTextureKey, Spec> = {
  mountainColor: {
    file: 'mountain-color',
    mobile: 'mountain-color-1k',
    srgb: true,
    tiled: false,
  },
  mountainNormal: {
    file: 'mountain-normal',
    mobile: 'mountain-normal-1k',
    srgb: false,
    tiled: false,
  },
  stoneColor: { file: 'stone-color', srgb: true, tiled: true },
  stoneNormal: { file: 'stone-normal', srgb: false, tiled: true },
  stoneArm: { file: 'stone-arm', srgb: false, tiled: true },
  cliffColor: { file: 'cliff-color', srgb: true, tiled: true },
  cliffNormal: { file: 'cliff-normal', srgb: false, tiled: true },
  cliffArm: { file: 'cliff-arm', srgb: false, tiled: true },
  sandColor: { file: 'sand-color', mobile: 'sand-color-1k', srgb: true, tiled: true },
  sandNormal: { file: 'sand-normal', srgb: false, tiled: true },
}

export type MajesticTextureSource = {
  key: MajesticTextureKey
  url: string
  /** Réglages du loader du parc (requestTexture / attachTexture) : UV glTF, sans retournement. */
  options: TextureOptions
  tiled: boolean
}

/** URL d'une texture selon le palier (variante 1K sur mobile quand elle existe). */
export function majesticTextureUrl(key: MajesticTextureKey, mobile: boolean): string {
  const spec = MAJESTIC_TEXTURES[key]
  return `${DIR}${mobile && spec.mobile ? spec.mobile : spec.file}.webp`
}

/** Réglages de décodage d'une texture (loader du parc). */
export function majesticTextureOptions(key: MajesticTextureKey): TextureOptions {
  return { srgb: MAJESTIC_TEXTURES[key].srgb, flipY: false }
}

/** Toutes les textures du Sanctuaire pour un palier : clé, URL, réglages, répétition. */
export function majesticTextureSources(mobile: boolean): MajesticTextureSource[] {
  return KEYS.map((key) => ({
    key,
    url: majesticTextureUrl(key, mobile),
    options: majesticTextureOptions(key),
    tiled: MAJESTIC_TEXTURES[key].tiled,
  }))
}

/**
 * Lance le décodage de toutes les textures du Sanctuaire dans le cache partagé du parc (park/loader.ts,
 * hors du fil principal ; idempotent : mêmes URL et réglages, même texture). À appeler pendant le parc ;
 * attention, releaseTextures() du parc vide aussi ces entrées.
 */
export function preloadMajesticTextures(mobile: boolean): void {
  for (const { url, options } of majesticTextureSources(mobile)) {
    void requestTexture(url, options).catch(() => undefined)
  }
}
