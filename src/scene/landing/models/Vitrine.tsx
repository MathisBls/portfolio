// Devanture parisienne de la page /creation-site-internet-paris/ (visionneuse : brief agent V du
// 2026-10-09 ; mission du 2026-10-10 : « la devanture doit être aussi belle en 3D live que sur son
// poster »). Modèle : scripts/blender/model_landing_vitrine.py (nœuds Shop_*, voir son en-tête) ; poster
// Cycles public/posters/landing/vitrine.webp rendu à la vue de départ de views.ts (yaw -0.35).
// Le Studio commun (Studio.tsx, partagé avec la pizza et l'établi) laisse la façade dans l'ombre. On
// reprend donc ici, dans le repère du modèle (elles tournent avec lui, comme sur le poster), les lumières
// du poster (poster_lights du script) : clé froide en haut à gauche, douche chaude des cols-de-cygne sur
// l'enseigne, appoint chaud dans la boutique, qui déborde un peu sur le trottoir comme une vitrine allumée.
// Sans ombres portées, la clé éclairerait aussi l'intérieur à travers la façade (boutique grise, « en plein
// jour ») : les matériaux de la boutique ignorent donc les directionnelles et les spots (variante de
// shader) et ne reçoivent que l'appoint chaud, une lueur ambiante chaude et un peu d'environnement.
// Matériaux remplacés par nom de matériau Blender (copies : le GLB en cache n'est jamais muté) :
// - écran (Shop_Screen) : MeshBasicMaterial non tone-mappé, image du site (texture émissive du GLB) ;
// - diffuseurs des cols-de-cygne, globes, intérieur des abat-jour : lumineux, non tone-mappés ;
// - verre : reflets seuls, en mélange additif (pas de transmission, donc pas de seconde passe) ;
// - mur du fond (Shop_Interior_Wash) : lueur chaude plus forte.
// Animation sobre : la lueur de la boutique respire à peine ; au survol, le store se déroule un peu.
// Nombre de lumières fixe dès le montage (précompilation de warm.ts valable pour toute la vie de la scène).
// Reduced-motion : la visionneuse n'est jamais montée (poster seul, LandingModel.tsx).
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DirectionalLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  ShaderChunk,
  SpotLight,
} from 'three'
import { LANDING_ASSETS } from '../../../app/pages/landingAssets'
import { type Vec3, clamp, easeInOut } from '../../../lib/math'
import { DRACO_PATH } from '../../useModel'
import type { LandingObjectProps } from '../types'

const URL = LANDING_ASSETS.vitrine.model.url

/** Cotes du script Blender (mètres réels) -> repère de Shop_Root : échelle SC, recentrage CZ en z. */
const SC = 0.48
const CZ = 0.475
const at = (x: number, y: number, z: number): Vec3 => [x * SC, y * SC, (z - CZ) * SC]

/** Clé du poster (Key) : haut gauche, devant, froide ; appoint (Fill) : bas droite, chaud. */
const KEY = { from: at(-5.5, 7.5, 7.5), to: at(0, 1.8, 0.5), color: '#dfe7ff', intensity: 3 }
const FILL = { from: at(4, 1.5, 7), to: at(0, 1.2, 0.5), color: '#ffe2c4', intensity: 0.9 }
/** Douche des cols-de-cygne sur l'enseigne (SignWash), une par lampe (x = ±1.25 m). */
const SIGN = {
  x: 1.25,
  from: { y: 3.8, z: 0.68 },
  to: { x: 0.9, y: 3.2, z: 0.17 },
  color: '#ffe6c8',
  intensity: 0.6,
  angle: 0.62,
  penumbra: 0.9,
}
/** Appoint chaud sous le plafond de la boutique (ShopFill), portée limitée au trottoir proche. */
const SHOP = {
  at: at(-0.1, 2.75, -0.55),
  color: '#ffc27e',
  intensity: 1.8,
  distance: 2.6,
  decay: 1,
  /** Respiration : amplitude relative, pulsation (rad/s). */
  breath: 0.04,
  speed: 0.7,
}
/** Boutique : nœuds concernés, lueur ambiante chaude (émissif × couleur), part de l'environnement. */
const INSIDE = {
  nodes: new Set([
    'Shop_Interior',
    'Shop_Interior_Wash',
    'Shop_Display',
    'Shop_Plant',
    'Shop_Lamp_Pendant_0',
    'Shop_Lamp_Pendant_1',
  ]),
  warm: new Color('#ffb368'),
  ambient: 0.26,
  env: 0.25,
}
/** Mur du fond lumineux : intensité émissive (GLB : 1.1). */
const WASH = 1.1
/** Couleurs des sources visibles (non tone-mappées : elles restent franches). */
const GLOW = {
  screen: new Color(0.86, 0.86, 0.86),
  lamp: new Color('#ffe2b8'),
  globe: new Color('#ffd49c'),
  shade: new Color('#ffcf96'),
  shadeIntensity: 0.8,
}
/** Halo des cols-de-cygne, à la bouche de l'abat-jour (là où le poster voit la source) : taille (unités). */
const HALO = { x: 1.19, y: 3.78, z: 0.72, size: 0.14 }
/** Façade : retouches par matériau pour coller au rendu Cycles du poster : teinte multipliée (linéaire),
 * relief (échelle de la normal map), rugosité. */
type Retouch = { tint?: Vec3; relief?: number; roughness?: number }
const OUTSIDE: Partial<Record<string, Retouch>> = {
  Vit_Stone: { tint: [1, 1.08, 1.25] },
  Vit_Sett: { tint: [0.62, 0.63, 0.66], relief: 1.6 },
  Vit_Canvas: { tint: [0.64, 0.66, 0.66] },
  Vit_Brass: { roughness: 0.5 },
}
/** Verre : reflets de l'environnement seuls (intensité : celle de l'environnement du Studio). */
const GLASS = { roughness: 0.04 }
/** Store : déroulé supplémentaire au survol (rad autour de l'axe du rouleau, front qui descend). */
const AWNING_UNROLL = 0.07

/** Éclairage direct de la boutique : point lights seulement (ni directionnelles ni spots). */
const INSIDE_LIGHTS = ShaderChunk.lights_fragment_begin
  .replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0')
  .replace('#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0')
/** Part de l'environnement dans la boutique. Avec scene.environment, three impose
 * scene.environmentIntensity à envMapIntensity : on l'atténue donc dans le shader. */
const INSIDE_ENV = `#include <lights_fragment_maps>
#if defined( RE_IndirectDiffuse )
  iblIrradiance *= ${INSIDE.env.toFixed(3)};
#endif
#if defined( RE_IndirectSpecular )
  radiance *= ${INSIDE.env.toFixed(3)};
#endif`

type VitrineRig = {
  root: Object3D
  awning: Object3D | undefined
  shop: PointLight
  wash: MeshStandardMaterial | undefined
  lights: (DirectionalLight | SpotLight | PointLight)[]
  owned: { dispose: () => void }[]
}

/** Sources lumineuses visibles, verre : mêmes remplacements dedans et dehors. */
function special(source: Material): Material | null {
  switch (source.name) {
    case 'Vit_Screen': {
      const map = source instanceof MeshStandardMaterial ? source.emissiveMap : null
      return new MeshBasicMaterial({ map, color: GLOW.screen, toneMapped: false })
    }
    case 'Vit_LampGlow':
      return new MeshBasicMaterial({ color: GLOW.lamp, toneMapped: false })
    case 'Vit_GlobeGlow':
      return new MeshBasicMaterial({ color: GLOW.globe, toneMapped: false })
    case 'Vit_Glass':
      return new MeshStandardMaterial({
        color: '#000000',
        roughness: GLASS.roughness,
        metalness: 0,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    case 'Vit_ShadeIn':
      if (source instanceof MeshStandardMaterial) {
        const m = source.clone()
        m.emissive.copy(GLOW.shade)
        m.emissiveIntensity = GLOW.shadeIntensity
        return m
      }
      return null
    default:
      return null
  }
}

/** Variante « boutique » d'un matériau : éclairée de l'intérieur seulement. */
function inside(source: Material): Material | null {
  if (!(source instanceof MeshStandardMaterial)) return null
  const m = source.clone()
  if (source.name === 'Vit_Wash') {
    m.emissiveIntensity = WASH
  } else {
    m.emissive.copy(m.color).multiply(INSIDE.warm)
    m.emissiveMap = m.map
    m.emissiveIntensity = INSIDE.ambient
  }
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_fragment_begin>', INSIDE_LIGHTS)
      .replace('#include <lights_fragment_maps>', INSIDE_ENV)
  }
  m.customProgramCacheKey = () => 'vitrine-inside'
  return m
}

/** Retouche d'un matériau de façade (OUTSIDE), ou rien. */
function outside(source: Material): Material | null {
  const retouch = OUTSIDE[source.name]
  if (!retouch || !(source instanceof MeshStandardMaterial)) return null
  const m = source.clone()
  if (retouch.tint) m.color.multiply(new Color(...retouch.tint))
  if (retouch.relief !== undefined) m.normalScale.multiplyScalar(retouch.relief)
  if (retouch.roughness !== undefined) m.roughness = retouch.roughness
  return m
}

/** Halo radial (64 px), dessiné une fois dans un canvas. */
function haloTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)')
    g.addColorStop(0.75, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const isMaterial = (value: unknown): value is Material => value instanceof Material

function isInside(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (INSIDE.nodes.has(o.name)) return true
  }
  return false
}

function buildVitrine(source: Object3D): VitrineRig {
  const root = source.clone(true)
  const owned: VitrineRig['owned'] = []
  const cache = new Map<string, Material>()
  let wash: MeshStandardMaterial | undefined
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const value: unknown = object.material
    if (!isMaterial(value)) return
    const room = isInside(object)
    const key = `${value.uuid}:${room ? 'in' : 'out'}`
    let next = cache.get(key)
    if (!next) {
      const made = special(value) ?? (room ? inside(value) : outside(value))
      if (made) {
        made.name = value.name
        owned.push(made)
      }
      next = made ?? value
      cache.set(key, next)
    }
    object.material = next
    if (next.name === 'Vit_Wash' && next instanceof MeshStandardMaterial) wash = next
  })

  const key = new DirectionalLight(KEY.color, KEY.intensity)
  key.position.set(...KEY.from)
  key.target.position.set(...KEY.to)
  root.add(key, key.target)

  const fill = new DirectionalLight(FILL.color, FILL.intensity)
  fill.position.set(...FILL.from)
  fill.target.position.set(...FILL.to)
  root.add(fill, fill.target)

  const lights: VitrineRig['lights'] = [key, fill]
  for (const side of [-1, 1]) {
    const spot = new SpotLight(SIGN.color, SIGN.intensity, 0, SIGN.angle, SIGN.penumbra, 2)
    spot.position.set(...at(side * SIGN.x, SIGN.from.y, SIGN.from.z))
    spot.target.position.set(...at(side * SIGN.to.x, SIGN.to.y, SIGN.to.z))
    root.add(spot, spot.target)
    lights.push(spot)
  }

  const shop = new PointLight(SHOP.color, SHOP.intensity, SHOP.distance, SHOP.decay)
  shop.position.set(...SHOP.at)
  root.add(shop)
  lights.push(shop)

  const halo = haloTexture()
  const haloMaterial = new MeshBasicMaterial({
    map: halo,
    color: GLOW.lamp,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const quad = new PlaneGeometry(HALO.size, HALO.size)
  owned.push(halo, haloMaterial, quad)
  for (const side of [-1, 1]) {
    const mesh = new Mesh(quad, haloMaterial)
    mesh.name = side < 0 ? 'Shop_Lamp_L_Halo' : 'Shop_Lamp_R_Halo'
    mesh.position.set(...at(side * HALO.x, HALO.y, HALO.z))
    root.add(mesh)
  }

  return { root, awning: root.getObjectByName('Shop_Awning'), shop, wash, lights, owned }
}

function animateVitrine(rig: VitrineRig, hover: number, time: number): void {
  if (rig.awning) rig.awning.rotation.x = AWNING_UNROLL * easeInOut(clamp(hover))
  const breath = 1 + SHOP.breath * Math.sin(time * SHOP.speed)
  rig.shop.intensity = SHOP.intensity * breath
  if (rig.wash) rig.wash.emissiveIntensity = WASH * breath
}

function disposeVitrine(rig: VitrineRig): void {
  rig.owned.forEach((resource) => {
    resource.dispose()
  })
  rig.lights.forEach((light) => {
    light.dispose()
  })
}

export function Vitrine({ hover }: LandingObjectProps) {
  const { scene } = useGLTF(URL, DRACO_PATH)
  const rig = useMemo(() => buildVitrine(scene), [scene])
  useEffect(
    () => () => {
      disposeVitrine(rig)
    },
    [rig],
  )
  useFrame(({ clock }) => {
    animateVitrine(rig, hover.current, clock.elapsedTime)
  })
  return <primitive object={rig.root} />
}
