// Easter egg, arène (beats 2 et 3) : textures PBR du plateau, dans public/textures/easter/arena/.
// Générées par scripts/arena_textures.py depuis Poly Haven (CC0, crédit dans site.legal.ip.text) :
// velour_velvet (tapis et rideaux), rosewood_veneer1 (bois de rose laqué), leather_white (cuir
// capitonné), floor_tiles_06 (sol en marbre à damier). WebP ; « -1k » : version mobile des couleurs 2K
// (les autres cartes sont déjà en 1K, répétées sur les surfaces).
// Chargées en code (GLB sans image, convention du projet : docs/models.md) : useLoader les met en cache,
// EasterScene les attend pendant 'loading', Arena les prépare et les envoie au GPU pendant la
// précompilation (image figée), puis les libère au démontage.
import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  type WebGLRenderer,
} from 'three'

const DIR = '/textures/easter/arena/'

const KEYS = [
  'velvetColor',
  'velvetNormal',
  'velvetArm',
  'woodColor',
  'leatherNormal',
  'leatherArm',
  'marbleColor',
  'marbleNormal',
  'marbleArm',
] as const

export type ArenaTextureKey = (typeof KEYS)[number]
export type ArenaTextures = Record<ArenaTextureKey, Texture>

/** Cartes de couleur (sRGB) ; les autres sont des données (linéaires). */
const COLOR: ReadonlySet<ArenaTextureKey> = new Set(['velvetColor', 'woodColor', 'marbleColor'])

const FILES: Record<ArenaTextureKey, string> = {
  velvetColor: 'velvet-color',
  velvetNormal: 'velvet-normal',
  velvetArm: 'velvet-arm',
  woodColor: 'wood-color',
  leatherNormal: 'leather-normal',
  leatherArm: 'leather-arm',
  marbleColor: 'marble-color',
  marbleNormal: 'marble-normal',
  marbleArm: 'marble-arm',
}

/** Couleurs 2K sur desktop, 1K sur mobile. */
const HAS_1K: ReadonlySet<ArenaTextureKey> = new Set(['woodColor', 'marbleColor'])

export function arenaTextureUrls(mobile: boolean): string[] {
  return KEYS.map((key) => `${DIR}${FILES[key]}${mobile && HAS_1K.has(key) ? '-1k' : ''}.webp`)
}

/**
 * Textures de l'arène (suspend jusqu'au chargement ; cache de useLoader, même URL = même objet). Objet
 * stable d'un rendu à l'autre : sinon tout ce qui en dépend (matériaux de l'arène) serait reconstruit au
 * passage en 'running', avec des shaders à recompiler et des textures à renvoyer en pleine séquence.
 */
export function useArenaTextures(mobile: boolean): ArenaTextures {
  const loaded = useLoader(TextureLoader, arenaTextureUrls(mobile))
  return useMemo(() => {
    const out = {} as ArenaTextures
    KEYS.forEach((key, i) => {
      const texture = loaded[i]
      if (texture) out[key] = texture
    })
    return out
  }, [loaded])
}

/**
 * Réglages avant le premier envoi au GPU, puis envoi immédiat (pendant la précompilation) : UV glTF
 * (sans retournement vertical), répétition, espace de couleur, filtrage anisotrope.
 */
export function prepareArenaTextures(textures: ArenaTextures, gl: WebGLRenderer, mobile: boolean) {
  const anisotropy = Math.min(mobile ? 4 : 8, gl.capabilities.getMaxAnisotropy())
  KEYS.forEach((key) => {
    const texture = textures[key]
    texture.flipY = false
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.colorSpace = COLOR.has(key) ? SRGBColorSpace : NoColorSpace
    texture.anisotropy = anisotropy
    texture.needsUpdate = true
    gl.initTexture(texture)
  })
}

/** Libère la mémoire GPU (les images restent en cache : un nouveau lancement les renvoie). */
export function releaseArenaTextures(textures: ArenaTextures) {
  KEYS.forEach((key) => {
    textures[key].dispose()
  })
}
