// Easter egg v3 (docs/storyboards/easter-park.md, tous les beats) : ambiance de la séquence. Fond et
// brouillard (FogExp2, un seul type du début à la fin : un changement de type recompilerait les shaders),
// étoiles du ciel qui restent sur la route, fondu plein écran (E.fade : noir des transitions, rose du
// passage carte -> route, blanc rosé de la lumière qui inonde à l'ouverture des portes) et vignette :
// noire qui se resserre pendant le zoom sur le prisme (E.focus), rouge sur la route. Le rouge monte
// progressivement avec E.red : fond, brouillard, vignette. À la sortie du warp, le brouillard se referme
// sur la route (E.roadDim) ; dans l'espace, fond noir profond, presque sans brouillard, et les étoiles
// génériques laissent la place au ciel réaliste (space/Sky.tsx). Arène : salle close, sans étoiles, fond
// et brouillard violet très sombre (les colonnes et les rideaux se perdent dans la pénombre).
// Reduced-motion : étoiles immobiles.
// Second niveau (docs/storyboards/easter-majestic.md) : brume à l'échelle kilométrique (même FogExp2),
// couleur et densité données par le ciel de D4 (majesticSky : horizon vers la montagne, poussière),
// sans étoiles génériques (le ciel est celui de D4), fondu M.fade.
import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type FogExp2, type Mesh, type Points } from 'three'
import { majesticSky } from './majestic/env'
import { MAJESTIC_FOG } from './majestic/layout'
import { M } from './majestic/state'
import { FULLSCREEN_QUAD, createFader, updateFader } from './shaders'
import { E, SHOT } from './state'

const NIGHT = new Color('#07050b')
const BLOOD = new Color('#2c0307')
const DEEP = new Color('#010103')
const ROOM = new Color('#0b0614')
/** Densité du brouillard par plan ; la route se perd vers 300 unités, l'espace n'en a presque pas. */
const FOG: Record<number, number> = {
  [SHOT.sky]: 0.002,
  [SHOT.arena]: 0.012,
  [SHOT.road]: 0.0058,
  [SHOT.space]: 0.00001,
  [SHOT.park]: 0.0006,
  [SHOT.majestic]: MAJESTIC_FOG.density,
}
/** Brouillard de la route effacée (sortie du warp) : tout se perd au-delà de quelques dizaines d'unités. */
const FOG_DIMMED = 0.045
const fader = { fade: 0, tint: 0, vignette: 0, red: 0, aspect: 1 }

type AtmosphereProps = { mobile: boolean; reducedMotion: boolean }

export function Atmosphere({ mobile, reducedMotion }: AtmosphereProps) {
  const material = useMemo(() => createFader(), [])
  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )
  const background = useRef<Color>(null)
  const fog = useRef<FogExp2>(null)
  const quad = useRef<Mesh>(null)
  const stars = useRef<Points>(null)

  useFrame(({ size }) => {
    const road = E.shot === SHOT.road
    const space = E.shot === SHOT.space || E.shot === SHOT.park
    const arena = E.shot === SHOT.arena
    const majestic = E.shot === SHOT.majestic
    const tone = majestic ? majesticSky.fogColor : space ? DEEP : arena ? ROOM : NIGHT
    const red = road ? E.red * (1 - E.roadDim) : 0
    if (background.current) {
      background.current.copy(tone).lerp(BLOOD, red)
      if (road) background.current.lerp(DEEP, E.roadDim)
    }
    if (fog.current) {
      fog.current.color.copy(background.current ?? tone)
      const density = majestic ? majesticSky.fogDensity : (FOG[E.shot] ?? 0.002)
      fog.current.density = road ? density + (FOG_DIMMED - density) * E.roadDim : density
    }
    if (stars.current) stars.current.visible = !arena && !majestic && (!space || E.sky < 0.999)
    fader.fade = majestic ? Math.max(E.fade, M.fade) : E.fade
    fader.tint = E.fadeTint
    fader.vignette = road
      ? 0.15 * E.speed + 0.45 * red
      : E.shot === SHOT.sky
        ? 0.8 * E.focus
        : E.shot === SHOT.space
          ? 0.35
          : 0
    fader.red = road ? 1 : 0
    fader.aspect = size.width / Math.max(1, size.height)
    const drawn = updateFader(material, fader)
    if (quad.current) quad.current.visible = drawn
  })

  return (
    <>
      <color ref={background} attach="background" args={[NIGHT]} />
      <fogExp2 ref={fog} attach="fog" args={[NIGHT, 0.002]} />
      <Stars
        ref={stars}
        radius={90}
        depth={60}
        count={mobile ? 1500 : 4000}
        factor={4}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.6}
      />
      <mesh
        ref={quad}
        geometry={FULLSCREEN_QUAD}
        material={material}
        renderOrder={1000}
        frustumCulled={false}
      />
    </>
  )
}
