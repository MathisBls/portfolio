// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md, « Le parc (beat 8), tableaux dans
// l'ordre » et « Final ») : le parc d'attractions spatial, monté par EasterScene (D1) dans le Canvas
// unique et affiché seulement quand E.shot === SHOT.park (ou si `active` le force, page de test).
// Tableaux (repère local du parc, PARK_ORIGIN) : porte franchie au sortir de la lumière, allée des
// écrans, géante gazeuse magenta et son rail, lune glacée et grande roue, planète des cartes, B
// monumental. Ce qui suit la caméra (ciel, rayons, flare, poussière) est en coordonnées monde.
// Éclairage : un soleil directionnel (+ l'hémisphère faible d'EasterLights), une douce lumière de face
// sur le B au final, environnement PMREM du parc pour les reflets (env.ts). Les lumières restent montées
// (intensité 0 hors du parc) : aucun changement du nombre de lumières, aucun shader recompilé.
// Paliers : mobile (moins d'écrans, de vaisseaux, de cartes et de particules, textures 1K, aucune
// vidéo), sans bloom (émissifs ramenés à 1), reduced-motion (plans fixes, ni feux d'artifice ni
// poussière, objets figés à l'instant du plan). Chaque objet est construit hors React (*Rig.ts) et mis à
// jour par frame à partir de P (state.ts), sans setState.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type DirectionalLight, type Group, type Mesh, type Object3D, Vector3 } from 'three'
import { useEasterModel } from '../models'
import { FULLSCREEN_QUAD, createFader, updateFader } from '../shaders'
import { attachScreens, buildAlley, loadVideos, updateAlley } from './alleyRig'
import { sceneTime } from './camera'
import { buildCardPlanet, updateCardPlanet } from './cardsRig'
import { buildCoaster, updateCoaster } from './coasterRig'
import { parkTextures, preloadPark, releasePark } from './assets'
import { createParkEnvironment } from './env'
import { buildFleet, updateFleet } from './fleetRig'
import { buildGate } from './gateRig'
import { parkOn, shouldLoad } from './hooks'
import { MONUMENT, PARK_ORIGIN, WINDOWS, within } from './layout'
import { buildMonument, updateMonument } from './monumentRig'
import { attachTexture } from './loader'
import { createFireworks, pointScale } from './particles'
import { type Parts, applyEnvironment, resolveParts } from './parts'
import { setPlanetMap } from './planetMaterials'
import { setSkyMap } from './skyMaterials'
import { SUN, buildSky, updateSky } from './skyRig'
import { P, parkTime } from './state'
import { PARK_BEAT, PARK_DROP, PARK_DURATION } from './timeline'
import { buildWheel, updateWheel } from './wheelRig'

export type ParkProps = {
  mobile: boolean
  reducedMotion: boolean
  bloom: boolean
  /** Force l'affichage (page de test) ; sinon le parc suit E.shot. */
  active?: boolean
}

type TierProps = ParkProps & { parts: Parts }

const ORIGIN = new Vector3(...PARK_ORIGIN)

// Préchargement des images du parc dès l'évaluation du chunk de l'easter egg (stage 'loading')
preloadPark()

/** Temps de la scène (objets figés à l'instant du plan fixe en reduced-motion). */
const now = () => sceneTime(parkTime(), P.reduced)

/** Pulsation douce du tempo (0 -> 1), nulle avant le premier temps fort. */
function pulse(): number {
  const music = P.t + P.music
  if (PARK_BEAT <= 0 || music < PARK_DROP) return 0
  return 0.5 + 0.5 * Math.cos(((music - PARK_DROP) / PARK_BEAT) * Math.PI * 2)
}

function Sky({ mobile, reducedMotion, bloom, active }: ParkProps) {
  const rig = useMemo(() => buildSky(mobile), [mobile])
  useEffect(() => rig.dispose, [rig])
  useFrame(({ camera, size, viewport }) => {
    updateSky(rig, {
      on: parkOn(active),
      camera,
      aspect: size.width / Math.max(1, size.height),
      dpr: viewport.dpr,
      time: parkTime(),
      scene: now(),
      reduced: reducedMotion,
      bloom,
    })
  })
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const { url, options } = parkTextures(mobile).sky
    return attachTexture(gl, url, options, (texture) => {
      setSkyMap(rig.sky, texture)
    })
  }, [gl, rig, mobile])
  return <primitive object={rig.root} />
}

function Lights({ bloom, active }: ParkProps) {
  const sun = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  useFrame(({ camera }) => {
    const on = parkOn(active)
    const s = sun.current
    if (s) {
      s.intensity = on ? (bloom ? 2.8 : 2.1) : 0
      s.target.position.copy(camera.position)
      s.position.copy(camera.position).addScaledVector(SUN, 100)
      s.target.updateMatrixWorld()
    }
    const f = fill.current
    if (f) {
      f.intensity = on ? (bloom ? 1.1 : 0.45) * P.halo : 0
      f.target.position.set(...MONUMENT.center).add(ORIGIN)
      f.position.copy(camera.position)
      f.target.updateMatrixWorld()
    }
  })
  return (
    <>
      <directionalLight ref={sun} intensity={0} color="#fff1de" />
      <directionalLight ref={fill} intensity={0} color="#ffd9e6" />
    </>
  )
}

function Gate({ parts, bloom, active }: TierProps) {
  const rig = useMemo(() => buildGate(parts, bloom), [parts, bloom])
  useEffect(() => rig.dispose, [rig])
  useFrame(() => {
    showRig(rig.root, parkOn(active) && within(WINDOWS.gate, now()))
  })
  return <primitive object={rig.root} />
}

function showRig(root: Object3D, visible: boolean) {
  root.visible = visible
}

function Alley({ parts, mobile, bloom, active }: TierProps) {
  const { nodes } = useEasterModel('logo')
  const logo = nodes.B_Logo ?? null
  const gl = useThree((s) => s.gl)
  const rig = useMemo(() => buildAlley(parts, logo, mobile, bloom), [parts, logo, mobile, bloom])
  useEffect(() => rig.dispose, [rig])
  useEffect(() => attachScreens(rig, gl), [rig, gl])
  useFrame(() => {
    if (shouldLoad(active)) loadVideos(rig)
    updateAlley(rig, {
      visible: parkOn(active) && within(WINDOWS.alley, now()),
      time: now(),
      pulse: pulse(),
      accent: P.accent,
      lights: P.lights,
      hoopGain: bloom ? 2.6 : 1,
    })
  })
  return <primitive object={rig.root} />
}

function Fleet({ parts, mobile, bloom, active }: TierProps) {
  const rig = useMemo(() => buildFleet(parts, mobile, bloom), [parts, mobile, bloom])
  useEffect(() => rig.dispose, [rig])
  useFrame(() => {
    updateFleet(rig, parkOn(active), now(), (bloom ? 1.6 : 0.8) * (0.6 + 0.4 * P.lights))
  })
  return <primitive object={rig.root} />
}

function Coaster({ parts, mobile, bloom, active }: TierProps) {
  const rig = useMemo(() => buildCoaster(parts, mobile, bloom), [parts, mobile, bloom])
  useEffect(() => rig.dispose, [rig])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const { giant, ring } = parkTextures(mobile)
    const off = [
      attachTexture(gl, giant.url, giant.options, (texture) => {
        setPlanetMap(rig.planet, 'map', texture)
      }),
      attachTexture(gl, ring.url, ring.options, (texture) => {
        setPlanetMap(rig.planet, 'ring', texture)
        setPlanetMap(rig.ring, 'ring', texture)
      }),
    ]
    return () => {
      off.forEach((cancel) => {
        cancel()
      })
    }
  }, [gl, rig, mobile])
  useFrame(() => {
    updateCoaster(rig, {
      visible: parkOn(active) && within(WINDOWS.giant, now()),
      time: now(),
      music: P.t + P.music,
      beat: P.reduced ? 0 : PARK_BEAT,
      lights: P.lights,
      bloom,
    })
  })
  return <primitive object={rig.root} />
}

function Wheel({ parts, mobile, bloom, active }: TierProps) {
  const rig = useMemo(() => buildWheel(parts, mobile, bloom), [parts, mobile, bloom])
  useEffect(() => rig.dispose, [rig])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const { moon, night } = parkTextures(mobile)
    const off = [
      attachTexture(gl, moon.url, moon.options, (texture) => {
        setPlanetMap(rig.moon, 'map', texture)
      }),
      attachTexture(gl, night.url, night.options, (texture) => {
        setPlanetMap(rig.moon, 'night', texture)
      }),
    ]
    return () => {
      off.forEach((cancel) => {
        cancel()
      })
    }
  }, [gl, rig, mobile])
  useFrame(() => {
    updateWheel(rig, parkOn(active) && within(WINDOWS.wheel, now()), now())
  })
  return <primitive object={rig.root} />
}

function CardPlanet({ mobile, bloom, active }: TierProps) {
  const cards = useEasterModel('cards')
  const rig = useMemo(() => buildCardPlanet(cards, mobile, bloom), [cards, mobile, bloom])
  useEffect(() => rig.dispose, [rig])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const { cards: surface, night } = parkTextures(mobile)
    const off = [
      attachTexture(gl, surface.url, surface.options, (texture) => {
        setPlanetMap(rig.planet, 'map', texture)
      }),
      attachTexture(gl, night.url, night.options, (texture) => {
        setPlanetMap(rig.planet, 'night', texture)
      }),
    ]
    return () => {
      off.forEach((cancel) => {
        cancel()
      })
    }
  }, [gl, rig, mobile])
  useFrame(({ camera }) => {
    updateCardPlanet(
      rig,
      parkOn(active) && within(WINDOWS.cards, now()),
      now(),
      camera,
      (bloom ? 0.32 : 0.2) * P.lights,
    )
  })
  return <primitive object={rig.root} />
}

const eye = new Vector3()

function Monument({ bloom, reducedMotion, active }: TierProps) {
  const { nodes } = useEasterModel('logo')
  const logo = nodes.B_Logo
  const rig = useMemo(() => (logo ? buildMonument(logo, bloom) : null), [logo, bloom])
  useEffect(() => rig?.dispose, [rig])
  useFrame(({ camera }) => {
    if (!rig) return
    updateMonument(rig, {
      visible: parkOn(active) && within(WINDOWS.monument, now()),
      time: parkTime(),
      halo: P.halo,
      reduced: reducedMotion,
      bloom,
      camera,
      eye: eye.copy(camera.position).sub(ORIGIN),
    })
  })
  return rig ? <primitive object={rig.root} /> : null
}

type Show = 'gate' | 'finale'

const SHOWS: Record<
  Show,
  { center: readonly [number, number, number]; spread: readonly [number, number, number]; size: number }
> = {
  gate: { center: [0, 95, -330], spread: [170, 45, 120], size: 11 },
  finale: {
    center: [MONUMENT.center[0], MONUMENT.center[1] + 40, MONUMENT.center[2] - 140],
    spread: [320, 150, 90],
    size: 17,
  },
}

function Fireworks({ show, mobile, bloom, active }: ParkProps & { show: Show }) {
  const rig = useMemo(() => {
    const look = SHOWS[show]
    const parts = createFireworks({
      bursts: mobile ? 6 : show === 'finale' ? 16 : 11,
      particles: mobile ? 70 : 130,
      size: look.size,
      colors: ['#ff4fa8', '#ffd37a', '#7fe8ff', '#fff1f8'],
      seed: show === 'gate' ? 11 : 23,
    })
    parts.material.uniforms.uCenter.value.set(...look.center)
    parts.material.uniforms.uSpread.value.set(...look.spread)
    return parts
  }, [show, mobile])
  useEffect(
    () => () => {
      rig.geometry.dispose()
      rig.material.dispose()
    },
    [rig],
  )
  const points = useRef<Object3D>(null)
  useFrame(({ camera, size, viewport }) => {
    const intensity = show === 'gate' ? P.fireworksGate : P.fireworksFinale
    const on = parkOn(active) && intensity > 0.005
    if (points.current) points.current.visible = on
    if (!on) return
    setFireworks(rig.material.uniforms, {
      time: parkTime(),
      intensity: intensity * (bloom ? 1.4 : 0.9),
      scale: pointScale(size.height, (camera as { fov?: number }).fov ?? 60, viewport.dpr),
    })
  })
  return (
    <points
      ref={points}
      geometry={rig.geometry}
      material={rig.material}
      visible={false}
      frustumCulled={false}
    />
  )
}

function setFireworks(
  uniforms: ReturnType<typeof createFireworks>['material']['uniforms'],
  f: { time: number; intensity: number; scale: number },
) {
  uniforms.uTime.value = f.time
  uniforms.uIntensity.value = f.intensity
  uniforms.uScale.value = f.scale
}

/** Fondu propre au parc : noir des plans fixes, voile rose de la sortie de la porte. */
function Fader({ active }: ParkProps) {
  const material = useMemo(() => createFader(), [])
  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )
  const quad = useRef<Mesh>(null)
  useFrame(({ size }) => {
    const on = parkOn(active)
    const drawn =
      on &&
      updateFader(material, {
        fade: Math.max(P.fade, P.glare),
        tint: P.glare > P.fade ? 1 : 0,
        vignette: 0,
        red: 0,
        aspect: size.width / Math.max(1, size.height),
      })
    if (quad.current) quad.current.visible = drawn
  })
  return (
    <mesh
      ref={quad}
      geometry={FULLSCREEN_QUAD}
      material={material}
      renderOrder={1001}
      visible={false}
      frustumCulled={false}
    />
  )
}

/** Beat 9 : passé la fin de la timeline, le temps du parc continue (dérive de la caméra). */
function Linger({ active }: ParkProps) {
  useFrame((_, delta) => {
    if (!parkOn(active)) return
    if (P.t >= PARK_DURATION - 1e-3 && !P.reduced) P.linger += Math.min(delta, 0.1)
    else P.linger = 0
  })
  return null
}

export function Park(props: ParkProps) {
  const { mobile, reducedMotion, bloom, active } = props
  const { nodes } = useEasterModel('park')
  const parts = useMemo(() => resolveParts(nodes), [nodes])
  useEffect(() => parts.dispose, [parts])
  // Images décodées gardées pour la durée de la séquence, libérées en sortant
  useEffect(() => {
    preloadPark(mobile)
    return releasePark
  }, [mobile])
  const gl = useThree((s) => s.gl)
  const root = useRef<Group>(null)
  // Environnement du parc pour les reflets (après le montage des objets, avant la précompilation)
  useEffect(() => {
    const group = root.current
    if (!group) return
    const env = createParkEnvironment(gl, SUN)
    applyEnvironment(group, env.texture, 1)
    return () => {
      applyEnvironment(group, null)
      env.dispose()
    }
  }, [gl, parts, mobile, bloom])
  useFrame(() => {
    if (root.current) root.current.visible = parkOn(active)
  })
  const tier = { ...props, parts }
  return (
    <>
      <Linger {...props} />
      <Sky {...props} />
      <Lights {...props} />
      <group ref={root} position={PARK_ORIGIN} visible={false}>
        <Gate {...tier} />
        <Alley {...tier} />
        <Fleet {...tier} />
        <Coaster {...tier} />
        <Wheel {...tier} />
        <CardPlanet {...tier} />
        <Monument {...tier} />
        {!reducedMotion && <Fireworks {...props} show="gate" />}
        {!reducedMotion && <Fireworks {...props} show="finale" />}
      </group>
      <Fader {...props} />
    </>
  )
}
