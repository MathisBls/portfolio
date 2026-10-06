// Easter egg v3, beats 4 et 5 (docs/storyboards/easter-park.md : « Dérive très lente. Ciel étoilé
// réaliste avec la Voie lactée, le limbe d'une planète éclairée à contre-jour dans un coin ») : le ciel de
// l'espace, centré sur la caméra. Il apparaît en fondu à la sortie du warp (E.sky), quand les traînées se
// résorbent en étoiles. Panorama ESO (SKY), étoiles nettes, la Terre côté nuit et son atmosphère
// (skyShaders.ts). Dérive très lente du ciel, coupée en reduced-motion. Mobile : panorama 2K, planète 1K,
// moins d'étoiles.
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { type Group, SRGBColorSpace, type Texture } from 'three'
import { E, SHOT } from '../state'
import { PLANETS, SKY } from '../park/textures'
import { PLANET, SKY_RADIUS, SKY_ROTATION, STAR_RADIUS, SUN } from './layout'
import {
  type HaloMaterial,
  type PlanetMaterial,
  type SkyMaterial,
  type StarMaterial,
  createAtmosphere,
  createPlanetMaterial,
  createSkyMaterial,
  createStars,
} from './skyShaders'

/** Dérive du ciel (rad/s) : on la devine à peine. */
const DRIFT = 0.0022

type SkyProps = { mobile: boolean; reducedMotion: boolean }

function prepare(texture: Texture | undefined, anisotropy: number) {
  if (!texture) return
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.needsUpdate = true
}

type SkyMaterials = {
  sky: SkyMaterial | null
  stars: { material: StarMaterial }
  planet: PlanetMaterial | null
  atmosphere: HaloMaterial
}

/** Réglage par frame : fondu d'apparition, temps de la respiration des étoiles, taille des points. */
function updateSky(m: SkyMaterials, opacity: number, time: number, pixel: number) {
  if (m.sky) m.sky.uniforms.uOpacity.value = opacity
  const stars = m.stars.material.uniforms
  stars.uOpacity.value = opacity
  stars.uTime.value = time
  stars.uPixel.value = pixel
  if (m.planet) m.planet.uniforms.uOpacity.value = opacity
  m.atmosphere.uniforms.uOpacity.value = opacity
}

export function Sky({ mobile, reducedMotion }: SkyProps) {
  const [milkyWay, night] = useTexture([
    mobile ? SKY.mobile : SKY.full,
    mobile ? PLANETS.earthNight.mapMobile : PLANETS.earthNight.map,
  ])
  const gl = useThree((s) => s.gl)
  // Avant la première image (envoi au GPU) : espace couleur sRGB, filtrage anisotrope
  useLayoutEffect(() => {
    prepare(milkyWay, mobile ? 2 : 8)
    prepare(night, 4)
  }, [milkyWay, night, mobile])
  const res = useMemo(() => {
    return {
      sky: milkyWay ? createSkyMaterial(milkyWay) : null,
      stars: createStars(mobile ? 1200 : 3200, STAR_RADIUS),
      planet: night ? createPlanetMaterial(night, SUN) : null,
      atmosphere: createAtmosphere(SUN, PLANET.atmosphere),
    }
  }, [milkyWay, night, mobile])
  useEffect(
    () => () => {
      res.sky?.dispose()
      res.stars.geometry.dispose()
      res.stars.material.dispose()
      res.planet?.dispose()
      res.atmosphere.dispose()
    },
    [res],
  )
  const root = useRef<Group>(null)
  const turn = useRef<Group>(null)

  useFrame(({ camera, clock }, delta) => {
    const r = root.current
    if (!r) return
    r.visible = E.shot === SHOT.space && E.sky > 0.001
    if (!r.visible) return
    r.position.copy(camera.position)
    if (turn.current && !reducedMotion) turn.current.rotation.y += DRIFT * delta
    updateSky(res, E.sky, clock.elapsedTime, gl.getPixelRatio())
  })

  return (
    // Visible au montage : la précompilation des shaders (stage 'compiling') ne voit que le visible
    <group ref={root}>
      <group ref={turn}>
        <group rotation={SKY_ROTATION}>
          {res.sky && (
            <mesh scale={[-SKY_RADIUS, SKY_RADIUS, SKY_RADIUS]} renderOrder={-30} material={res.sky}>
              <sphereGeometry args={[1, 64, 32]} />
            </mesh>
          )}
          <points
            geometry={res.stars.geometry}
            material={res.stars.material}
            renderOrder={-29}
            frustumCulled={false}
          />
        </group>
      </group>
      <group position={PLANET.center}>
        {res.planet && (
          <mesh scale={PLANET.radius} rotation={[0.4, 2.2, 0.1]} renderOrder={-28} material={res.planet}>
            <sphereGeometry args={[1, 96, 48]} />
          </mesh>
        )}
        <mesh scale={PLANET.radius * PLANET.atmosphere} renderOrder={-27} material={res.atmosphere}>
          <sphereGeometry args={[1, 96, 48]} />
        </mesh>
      </group>
    </group>
  )
}
