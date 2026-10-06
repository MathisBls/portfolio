// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7, et « Composants
// de D4 ») : l'environnement du second niveau, monté par D3 dans le Canvas unique. Il lit M (state.ts)
// dans useFrame et ne fait aucun setState. Visible seulement sur le plan du sanctuaire (majesticOn), ou
// si `active` le force (banc de test). La construction et les mises à jour sont dans rig.ts.
// Paliers : mobile (moins de particules et de débris, sans reflet, textures 1K), sans bloom (émissifs
// compressés), reduced-motion (rien de rapide : ni ondes, ni tremblement, ni éclairs, ni débris en vol).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { type Object3D, PerspectiveCamera, RepeatWrapping, type Texture } from 'three'
import { PLANETS } from '../../park/textures'
import { attachTexture, requestTexture } from '../../park/loader'
import { M, majesticOn } from '../state'
import { type MajesticTextureKey, majesticTextureOptions, majesticTextureUrl } from '../textures'
import { type EnvFrame, buildEnv, setMoonMap, setSandMap, updateEnv } from './rig'
import { registerEnv } from './warm'

export type MajesticEnvProps = {
  mobile: boolean
  reducedMotion: boolean
  bloom: boolean
  /** Force l'affichage (banc de test) ; sinon l'environnement suit E.shot. */
  active?: boolean
  /** Nœud Mountain de majestic.glb : relief exact pour les débris et les cascades (sinon approché). */
  mountain?: Object3D | null
  /** Nœuds Rock_A, Rock_B, Rock_C : formes des débris (sinon roches procédurales). */
  rocks?: readonly (Object3D | undefined)[]
}

const frame: EnvFrame = {
  camera: new PerspectiveCamera(),
  time: 0,
  delta: 0,
  dpr: 1,
  height: 1,
  visible: false,
}

export function MajesticEnv({
  mobile,
  reducedMotion,
  bloom,
  active,
  mountain,
  rocks,
}: MajesticEnvProps) {
  const rig = useMemo(
    () => buildEnv({ mobile, reduced: reducedMotion, bloom, mountain, rocks }),
    [mobile, reducedMotion, bloom, mountain, rocks],
  )
  useEffect(() => rig.dispose, [rig])
  useEffect(() => registerEnv(rig), [rig])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const url = mobile ? PLANETS.moon.mapMobile : PLANETS.moon.map
    return attachTexture(gl, url, { srgb: true }, (texture) => {
      setMoonMap(rig, texture)
    })
  }, [gl, rig, mobile])

  // Sable de B2 (tuiles répétées : RepeatWrapping posé avant l'envoi au GPU) ; normale sur desktop
  useEffect(() => {
    let alive = true
    const load = (key: MajesticTextureKey, apply: (texture: Texture) => void) => {
      requestTexture(majesticTextureUrl(key, mobile), majesticTextureOptions(key)).then(
        (texture) => {
          if (!alive) return
          texture.wrapS = RepeatWrapping
          texture.wrapT = RepeatWrapping
          texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
          texture.needsUpdate = true
          gl.initTexture(texture)
          apply(texture)
        },
        () => undefined,
      )
    }
    load('sandColor', (texture) => {
      setSandMap(rig, 'color', texture)
    })
    if (!mobile) {
      load('sandNormal', (texture) => {
        setSandMap(rig, 'normal', texture)
      })
    }
    return () => {
      alive = false
    }
  }, [gl, rig, mobile])

  useFrame((state, delta) => {
    frame.camera = state.camera as PerspectiveCamera
    frame.time = state.clock.elapsedTime
    frame.delta = Math.min(delta, 1 / 20)
    frame.dpr = state.viewport.dpr
    frame.height = state.size.height
    frame.visible = active ?? majesticOn()
    updateEnv(rig, M, frame)
  })

  return <primitive object={rig.root} />
}
