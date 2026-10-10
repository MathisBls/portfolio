// Diaporama d'écrans (captures réelles fournies par Mathis, public/textures/<projet>/) sur un mesh
// d'écran du GLB : l'écran suivant apparaît en fondu par-dessus (second mesh, même géométrie), puis
// devient l'écran courant. Commun à Fitness, Wegir et Meme Rina (docs/storyboards/projects.md §2).
// Les matériaux sont mutés via les refs des meshes (le lint interdit de muter l'objet du useMemo).
// Objets 3D sur mobile (2026-10-10, aucun gel) : les captures du diaporama sont décodées hors du thread
// principal (ImageBitmapLoader, comme GLTFLoader, sauf vieux Safari et Firefox) puis envoyées au GPU une
// par image (uploadQueue), au lieu d'un décodage et d'un envoi groupés au montage (drei useTexture).
// useScreenTextures (easter egg) est inchangé.
import { useTexture } from '@react-three/drei'
import { useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  ImageBitmapLoader,
  ImageLoader,
  type Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
} from 'three'
import { queueUpload } from '../uploadQueue'

type ScreenCycleOptions = {
  /** Durée d'affichage d'un écran, puis du fondu vers le suivant (s, en temps de phase). */
  hold?: number
  fade?: number
  /** Sous le blanc pur : un écran plein éblouirait sur fond noir. */
  tint?: number
}

/** Matériau d'écran : sans éclairage (couleurs exactes de la capture), sans tone mapping. */
export function screenMaterial(map: Texture | null, tint: number, opacity = 1) {
  return new MeshBasicMaterial({
    map,
    color: new Color(tint, tint, tint),
    transparent: opacity < 1,
    opacity,
    side: DoubleSide,
    toneMapped: false,
  })
}

const basic = (mesh: Mesh | null) =>
  mesh?.material instanceof MeshBasicMaterial ? mesh.material : null

/** Textures de captures pour des UV glTF : sRGB, sans retournement vertical. */
/** Prépare une capture pour des UV glTF : sRGB, sans retournement vertical. */
const prepare = (t: Texture) => {
  t.flipY = false
  t.colorSpace = SRGBColorSpace
  t.needsUpdate = true
}

/** Textures de captures, préparées au chargement (callback de useTexture, une seule fois). */
export function useScreenTextures(urls: string[]) {
  return useTexture(urls, (loaded) => {
    loaded.forEach(prepare)
  })
}

/** Décodage hors du thread principal possible (mêmes exclusions que GLTFLoader de three). */
function bitmapsSupported(): boolean {
  if (typeof createImageBitmap === 'undefined') return false
  const ua = navigator.userAgent
  const safari = /^((?!chrome|android).)*safari/i.test(ua)
  const safariVersion = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? -1)
  const firefoxVersion = Number(/Firefox\/(\d+)\./.exec(ua)?.[1] ?? -1)
  return !(safari && safariVersion < 17) && !(ua.includes('Firefox') && firefoxVersion < 98)
}

type ScreenImage = ImageBitmap | HTMLImageElement
const useBitmaps = (urls: string[]): ScreenImage[] => useLoader(ImageBitmapLoader, urls)
const useElements = (urls: string[]): ScreenImage[] => useLoader(ImageLoader, urls)
/** Choix fixé pour la session : l'ordre des hooks ne change jamais. */
const useScreenImages =
  typeof window !== 'undefined' && bitmapsSupported() ? useBitmaps : useElements

/**
 * Textures du diaporama : une par capture et par objet (libérées au démontage, l'image reste en cache),
 * envoyées au GPU une par image dès le montage, avant le chapitre.
 */
function useCycleTextures(urls: string[]): Texture[] {
  const images = useScreenImages(urls)
  const textures = useMemo(
    () =>
      images.map((image) => {
        const texture = new Texture(image)
        prepare(texture)
        return texture
      }),
    [images],
  )
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const cancel = queueUpload(gl, textures)
    return () => {
      cancel()
      textures.forEach((texture) => {
        texture.dispose()
      })
    }
  }, [gl, textures])
  return textures
}

export function useScreenCycle(
  urls: string[],
  { hold = 2.6, fade = 0.45, tint = 0.88 }: ScreenCycleOptions = {},
) {
  const textures = useCycleTextures(urls)
  const materials = useMemo(
    () => ({
      shown: screenMaterial(textures[0] ?? null, tint),
      next: screenMaterial(textures[1 % textures.length] ?? null, tint, 0),
    }),
    [textures, tint],
  )
  useEffect(
    () => () => {
      materials.shown.dispose()
      materials.next.dispose()
    },
    [materials],
  )

  const shownRef = useRef<Mesh>(null)
  const nextRef = useRef<Mesh>(null)
  const current = useRef(0)

  /** À appeler dans useFrame avec la phase de l'objet (s). */
  const update = (t: number) => {
    const shown = basic(shownRef.current)
    const next = basic(nextRef.current)
    const overlay = nextRef.current
    if (!shown || !next || !overlay || textures.length < 2) return
    const cycle = hold + fade
    const index = Math.floor(t / cycle) % textures.length
    const local = t % cycle
    if (index !== current.current) {
      current.current = index
      shown.map = textures[index] ?? null
    }
    const upcoming = textures[(index + 1) % textures.length] ?? null
    if (next.map !== upcoming) next.map = upcoming
    next.opacity = local > hold ? (local - hold) / fade : 0
    overlay.visible = next.opacity > 0
  }

  return { materials, shownRef, nextRef, update, textures }
}
