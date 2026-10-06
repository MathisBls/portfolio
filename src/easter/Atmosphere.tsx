// Easter egg : ambiance de la séquence. Fond et brouillard (FogExp2, un seul type du début à la fin : un
// changement de type recompilerait les shaders), étoiles du ciel (beats 1–2) qui restent pendant le vol,
// fondu plein écran (E.fade : noir des transitions, beats 1 et 6) et vignette rouge (vol et final).
// Le rouge monte progressivement avec E.red (beat 5) : fond, brouillard, vignette. Reduced-motion :
// étoiles immobiles.
import { Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type FogExp2, type Mesh } from 'three'
import { FULLSCREEN_QUAD, createFader, updateFader } from './shaders'
import { E, SHOT } from './state'

const NIGHT = new Color('#07050b')
const BLOOD = new Color('#2c0307')
const FINALE = new Color('#150205')
/** Densité du brouillard par plan (ciel, arène, vol, final). */
const FOG = [0.002, 0.016, 0.011, 0.0018]

type AtmosphereProps = { mobile: boolean; reducedMotion: boolean }

export function Atmosphere({ mobile, reducedMotion }: AtmosphereProps) {
  const fader = useMemo(() => createFader(), [])
  useEffect(
    () => () => {
      fader.dispose()
    },
    [fader],
  )
  const background = useRef<Color>(null)
  const fog = useRef<FogExp2>(null)
  const quad = useRef<Mesh>(null)

  useFrame(({ size }) => {
    const flight = E.shot === SHOT.flight
    const finale = E.shot === SHOT.finale
    const tone = finale ? FINALE : NIGHT
    const red = flight ? E.red : 0
    if (background.current) background.current.copy(tone).lerp(BLOOD, red)
    if (fog.current) {
      fog.current.color.copy(tone).lerp(BLOOD, red)
      fog.current.density = FOG[E.shot] ?? 0.002
      if (flight) fog.current.density += 0.008 * red
    }
    const vignette = flight ? 0.15 * E.speed + 0.45 * red : finale ? 0.55 * E.halo : 0
    const aspect = size.width / Math.max(1, size.height)
    const drawn = updateFader(fader, E.fade, vignette, aspect)
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
        material={fader}
        renderOrder={1000}
        frustumCulled={false}
      />
    </>
  )
}
