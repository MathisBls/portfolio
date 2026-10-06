// Diaporama d'écrans (captures réelles fournies par Mathis, public/textures/<projet>/) sur un mesh
// d'écran du GLB : l'écran suivant apparaît en fondu par-dessus (second mesh, même géométrie), puis
// devient l'écran courant. Commun à Fitness, Wegir et Meme Rina (docs/storyboards/projects.md §2).
// Les matériaux sont mutés via les refs des meshes (le lint interdit de muter l'objet du useMemo).
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  type Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Texture,
} from 'three'

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

export function useScreenCycle(
  urls: string[],
  { hold = 2.6, fade = 0.45, tint = 0.88 }: ScreenCycleOptions = {},
) {
  const textures = useScreenTextures(urls)
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
