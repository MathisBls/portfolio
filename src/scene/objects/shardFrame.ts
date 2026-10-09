// Placement par frame du champ d'éclats (ShardField.tsx), hors React. Aucune allocation : objets de
// travail au niveau du module, boucles for, matrices et opacités écrites dans l'InstancedMesh.
// Écriture des instances, intro et reduced-motion : shardPlace.ts.
// docs/storyboards/story-v2.md :
// - « Chargement (≈ 1.5 s) : des éclats convergent et s'assemblent en prisme » : horloge de l'intro,
//   fondu du champ, apparition du prisme (intro.ts, lu par Prism.tsx).
// - « Work : les éclats défilent en parallaxe » : colonne ancrée dans le monde autour de la caméra
//   (la caméra descend : le champ monte), plus le défilement au scroll (getPageScroll), les proches
//   plus vite ; bouclage vertical ; dérive inverse au pointeur.
// - « Bandeau : accélèrent » (vitesse du scroll), « Services : ralentissent », « About : calme ».
// - « Contact (arrivée) : les éclats se rassemblent autour de lui » : couronne lente autour du prisme.
// - Brief : le centre de l'écran reste dégagé tant que le prisme y est (hero, puis Contact).
import { type Camera, type InstancedMesh, MathUtils, type Matrix4, Vector3 } from 'three'
import { lerp } from '../../lib/math'
import type { ShardLayout } from '../../lib/shardLayout'
import {
  CROWN,
  type ClearZone,
  INTRO,
  SCROLL,
  clearCenter,
  columnY,
  crownPresence,
  crownT,
  fieldFadeAt,
  fieldPace,
  fieldPresence,
  prismRevealAt,
  scrollBoost,
  visibleHalfHeight,
} from '../../lib/shards'
import { setPrismReveal } from '../intro'
import { prismPresence, prismY } from '../prismPath'
import { getPageScroll, getProgress, getTimeline } from '../store'
import type { Damped2 } from '../usePointerDamp'
import { type Alpha, placeIntro, placeShard, placeStatic } from './shardPlace'

/** Dérive maximale au pointeur (unités monde, × parallaxe de l'éclat), en sens inverse. */
const DRIFT = { x: 0.5, y: 0.35 }
/**
 * Zone dégagée : demi-axes en unités monde sur le plan du prisme, relevée vers le nom. En portrait
 * étroit, elle suit l'échelle du prisme (Prism.tsx : SCALE_PER_ASPECT / SCALE = 1.19 × aspect), bornée.
 */
const CLEAR = { x: 1.75, y: 1.95, lift: 0.12, fitPerAspect: 1.19, max: { x: 0.62, y: 0.85 } }
const MAX_DT = 1 / 30

export type FieldRuntime = {
  /** Temps du champ (s) : avance selon l'allure de la section et la vitesse du scroll. */
  time: number
  lastScroll: number
  /** Vitesse du scroll lissée (px/s). */
  speed: number
  /** performance.now() de la première frame rendue (début de l'intro), null avant. */
  introStart: number | null
  introDone: boolean
}

export const createRuntime = (): FieldRuntime => ({
  time: 0,
  lastScroll: 0,
  speed: 0,
  introStart: null,
  introDone: false,
})

const position = new Vector3()
const ring = new Vector3()
const screen = { u: 0, v: 0 }
const zone: ClearZone = { cx: 0, cy: 0, rx: 1, ry: 1 }

/** Avance l'horloge de l'intro et du champ ; renvoie le temps écoulé depuis la première frame (s). */
function advance(rt: FieldRuntime, delta: number, now: number): number {
  const scroll = getPageScroll()
  if (rt.introStart === null) {
    rt.introStart = now
    rt.lastScroll = scroll
  }
  // Page rechargée plus bas : pas d'intro, le prisme est déjà ailleurs et le champ s'affiche tout de
  // suite. Vérifié à chaque image de l'intro, pas seulement à la première : la position de scroll
  // restaurée (et donc la timeline) peut n'arriver qu'après les premières images, et le champ restait
  // alors invisible le temps de son fondu d'intro (retour de Mathis du 2026-10-09).
  if (!rt.introDone && getTimeline() > INTRO.skipAfter) rt.introDone = true
  const elapsed = (now - rt.introStart) / 1000
  if (elapsed >= INTRO.duration) rt.introDone = true
  const dt = Math.min(delta, MAX_DT)
  const speed = dt > 0 ? (scroll - rt.lastScroll) / dt : 0
  rt.lastScroll = scroll
  rt.speed = MathUtils.damp(rt.speed, speed, SCROLL.damping, dt)
  rt.time += dt * fieldPace(getTimeline()) * (1 + scrollBoost(rt.speed))
  return elapsed
}

export function updateShardField(
  mesh: InstancedMesh,
  layout: ShardLayout,
  shapes: readonly Matrix4[],
  rt: FieldRuntime,
  camera: Camera,
  viewport: { width: number; height: number },
  delta: number,
  drift: Damped2,
  still: boolean,
) {
  const alpha = mesh.geometry.getAttribute('instanceAlpha')
  const aspect = viewport.width / Math.max(1, viewport.height)
  if (still) {
    placeStatic(mesh, layout, shapes, alpha, camera, aspect)
  } else {
    const elapsed = advance(rt, delta, performance.now())
    const intro = !rt.introDone && layout.intro.length > 0
    setPrismReveal(rt.introDone ? 1 : prismRevealAt(elapsed))
    mesh.count = layout.field.length + (intro ? layout.intro.length : 0)
    const fade = (rt.introDone ? 1 : fieldFadeAt(elapsed)) * fieldPresence(getTimeline())
    placeField(mesh, layout, shapes, alpha, rt, camera, viewport.height, aspect, drift, fade)
    if (intro) placeIntro(mesh, layout, shapes, alpha, elapsed, prismY())
  }
  mesh.instanceMatrix.needsUpdate = true
  alpha.needsUpdate = true
}

/** Zone dégagée centrée sur le prisme à l'écran (coordonnées normalisées de la caméra courante). */
function updateZone(camera: Camera, aspect: number, center: number) {
  const cam = camera.position
  const halfH0 = visibleHalfHeight(Math.max(0.1, cam.z))
  const halfW0 = halfH0 * aspect
  const fit = Math.min(1, CLEAR.fitPerAspect * aspect)
  zone.cx = -cam.x / halfW0
  zone.cy = (center - cam.y) / halfH0 + CLEAR.lift * fit
  zone.rx = Math.min(CLEAR.max.x, (CLEAR.x * fit) / halfW0)
  zone.ry = Math.min(CLEAR.max.y, (CLEAR.y * fit) / halfH0)
}

function placeField(
  mesh: InstancedMesh,
  layout: ShardLayout,
  shapes: readonly Matrix4[],
  alpha: Alpha,
  rt: FieldRuntime,
  camera: Camera,
  height: number,
  aspect: number,
  drift: Damped2,
  fade: number,
) {
  const cam = camera.position
  const t = rt.time
  const scroll = getPageScroll()
  const contact = getProgress('contact')
  const center = prismY()
  const gather = crownPresence(contact)
  const clear = prismPresence()
  updateZone(camera, aspect, center)

  const { field } = layout
  for (let i = 0; i < field.length; i++) {
    const s = field[i]
    if (!s) continue
    const phase = s.floatFreq * t + s.floatPhase
    const rise = ((scroll * 2) / Math.max(1, height)) * s.halfRef * s.parallax * SCROLL.gain
    const x =
      s.xFrac * s.halfRef * aspect + s.floatAmp * Math.sin(phase) - drift.x * DRIFT.x * s.parallax
    const y =
      cam.y +
      columnY(s.yFrac, rise - cam.y, s.column) +
      s.floatAmp * Math.cos(0.8 * phase) -
      drift.y * DRIFT.y * s.parallax
    const hh = visibleHalfHeight(Math.max(0.1, cam.z - s.z))
    const hw = hh * aspect
    clearCenter((x - cam.x) / hw, (y - cam.y) / hh, zone, clear, s.xFrac, screen)
    position.set(cam.x + screen.u * hw, cam.y + screen.v * hh, s.z)

    let size = s.size
    let a = s.alpha * fade
    const g = s.crown ? crownT(contact, s.crown.delay) : 0
    if (s.crown && g > 0) {
      const angle = s.crown.angle + CROWN.speed * t
      const r = s.crown.radius
      ring.set(
        r * Math.cos(angle),
        center + s.crown.lift + r * Math.sin(angle) * Math.sin(CROWN.tilt),
        r * Math.sin(angle) * Math.cos(CROWN.tilt),
      )
      position.lerp(ring, g)
      size = lerp(size, s.crown.size, g)
      a = lerp(a, fade, g)
    } else {
      a *= 1 - CROWN.dim * gather
    }
    const rx = s.rotX + s.spinX * t
    placeShard(
      mesh,
      alpha,
      i,
      shapes[i],
      position,
      rx,
      s.rotY + s.spinY * t,
      s.rotZ + s.spinZ * t,
      size,
      a,
    )
  }
}
