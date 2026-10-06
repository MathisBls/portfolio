// Easter egg, arène : poussière qui flotte dans le faisceau du plafonnier (fx.ts). Points additifs, dérive
// lente calculée dans le shader (aucune mise à jour par frame côté CPU), visibles seulement dans le cône
// de lumière (bord fondu) et quand le plafonnier est allumé (uOn, arenaRig). Pas de scintillement :
// chaque grain garde sa luminosité, seule sa position dérive. Reduced-motion : grains immobiles.
// Mobile : trois fois moins de grains.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points, ShaderMaterial } from 'three'
import { TABLE_Y } from '../layout'
import { seeded } from '../shaders'
import { E, SHOT } from '../state'
import { BEAM, BEAM_TABLE_RADIUS } from './fx'
import { arenaLight } from './ramps'

const TOP = 17

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform vec3 uApex;
uniform float uBase;
uniform float uRadius;
attribute vec3 aSeed;
varying float vAlpha;
void main() {
  vec3 p = position;
  float span = ${TOP.toFixed(1)} - uBase;
  p.y = uBase + mod(p.y - uBase + uTime * (0.05 + 0.1 * aSeed.x), span);
  p.x += sin(uTime * (0.05 + 0.08 * aSeed.y) + aSeed.z * 6.283) * 0.6;
  p.z += cos(uTime * (0.04 + 0.07 * aSeed.z) + aSeed.y * 6.283) * 0.6;
  // Rayon du cône à cette hauteur (sommet uApex, rayon uRadius au niveau de la table)
  float k = clamp((uApex.y - p.y) / (uApex.y - uBase), 0.0, 1.0);
  float r = uRadius * k;
  float d = length(p.xz - uApex.xz);
  float inside = 1.0 - smoothstep(r * 0.55, r, d);
  float ends = smoothstep(0.0, 1.2, p.y - uBase) * (1.0 - smoothstep(span - 3.0, span, p.y - uBase));
  vAlpha = inside * ends * (0.35 + 0.65 * aSeed.x);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * (0.018 + 0.026 * aSeed.y) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOn;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vAlpha * uOn;
  gl_FragColor = vec4(uColor * a, a);
}`

type DustProps = { mobile: boolean; reducedMotion: boolean; bloom: boolean }

export function Dust({ mobile, reducedMotion, bloom }: DustProps) {
  const count = mobile ? 200 : 650
  const geometry = useMemo(() => {
    const random = seeded(77)
    const position = new Float32Array(count * 3)
    const seed = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2
      const r = Math.sqrt(random()) * BEAM_TABLE_RADIUS
      position[i * 3] = BEAM.apex.x + Math.cos(a) * r
      position[i * 3 + 1] = TABLE_Y + random() * (TOP - TABLE_Y)
      position[i * 3 + 2] = BEAM.apex.z + Math.sin(a) * r
      seed[i * 3] = random()
      seed[i * 3 + 1] = random()
      seed[i * 3 + 2] = random()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(position, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 3))
    return g
  }, [count])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 600 },
          uApex: { value: BEAM.apex.clone() },
          uBase: { value: TABLE_Y },
          uRadius: { value: BEAM_TABLE_RADIUS },
          uColor: { value: [1, 0.86, 0.7].map((c) => c * (bloom ? 0.8 : 0.55)) },
          uOn: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [bloom],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  const points = useRef<Points>(null)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  useFrame(({ clock, camera }) => {
    const p = points.current
    if (!p || E.shot !== SHOT.arena) return
    const shader = p.material
    if (!(shader instanceof ShaderMaterial)) return
    const uniforms = shader.uniforms
    if (uniforms.uTime) uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    if (uniforms.uOn) uniforms.uOn.value = arenaLight(E.arena).key
    // Taille des grains en pixels : hauteur de l'image / (2 tan(fov/2))
    const fov = 'fov' in camera && typeof camera.fov === 'number' ? camera.fov : 35
    const scale = (size.height * dpr) / (2 * Math.tan((fov * Math.PI) / 360))
    if (uniforms.uScale) uniforms.uScale.value = scale
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
