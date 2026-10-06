// Easter egg : ambiance de la séquence. Fond et brouillard (FogExp2, un seul type du début à la fin : un
// changement de type recompilerait les shaders), étoiles du ciel qui restent sur la route, fondu plein
// écran (E.fade : noir des transitions, rose du passage carte -> route) et vignette : noire qui se
// resserre pendant le zoom sur le prisme (E.focus), rouge sur la route et au final. Le rouge monte
// progressivement avec E.red : fond, brouillard, vignette. Reduced-motion : étoiles immobiles.
import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type FogExp2, type Mesh } from 'three'
import { FULLSCREEN_QUAD, createFader, updateFader } from './shaders'
import { E, SHOT } from './state'

const NIGHT = new Color('#07050b')
const BLOOD = new Color('#2c0307')
const FINALE = new Color('#150205')
/** Densité du brouillard par plan (ciel, arène, route, final) ; la route se perd vers 300 unités. */
const FOG = [0.002, 0.016, 0.0058, 0.0018]
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

  useFrame(({ size }) => {
    const road = E.shot === SHOT.road
    const finale = E.shot === SHOT.finale
    const tone = finale ? FINALE : NIGHT
    const red = road ? E.red : 0
    if (background.current) background.current.copy(tone).lerp(BLOOD, red)
    if (fog.current) {
      fog.current.color.copy(tone).lerp(BLOOD, red)
      fog.current.density = FOG[E.shot] ?? 0.002
    }
    fader.fade = E.fade
    fader.tint = E.fadeTint
    fader.vignette = road
      ? 0.15 * E.speed + 0.45 * red
      : finale
        ? 0.55 * E.halo
        : E.shot === SHOT.sky
          ? 0.8 * E.focus
          : 0
    fader.red = road || finale ? 1 : 0
    fader.aspect = size.width / Math.max(1, size.height)
    const drawn = updateFader(material, fader)
    if (quad.current) quad.current.visible = drawn
  })

  return (
    <>
      <color ref={background} attach="background" args={[NIGHT]} />
      <fogExp2 ref={fog} attach="fog" args={[NIGHT, 0.002]} />
      <Stars
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
