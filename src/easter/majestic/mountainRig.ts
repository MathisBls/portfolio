// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 4 « Une montagne
// gigantesque (kilométrique) sort du sol devant nous [...] Sur sa face, un B monumental sculpté », et beat
// 6 « Le B sculpté s'allume ») : la montagne, sans React. Mountain et Mountain_B, avec le sommet
// (summitRig.ts), dans un même groupe qui monte de MOUNTAIN.sunk sous la plaine jusqu'à y = 0 avec
// M.rise. Pendant la montée, la masse tremble légèrement (quelques mètres, bruit lisse) avec le séisme ;
// glissements de terrain et poussière : env/ (D4, M.slide). Le B s'allume en rampe avec M.sculpt
// (matériau émissif MountainB). Échelle : ramenée à MOUNTAIN.height d'après la boîte du modèle, ici (pas
// dans le GLB). Reduced-motion : aucune vibration.
import { Box3, Group, type MeshStandardMaterial, type Object3D } from 'three'
import { MOUNTAIN } from './layout'
import { type MajesticNodes, cloneNode, materialsNamed } from './model'
import type { MajesticState } from './state'
import { type SummitRig, buildSummit, updateSummit } from './summitRig'

export type MountainRig = {
  root: Group
  /** Groupe qui monte (montagne, B, sommet). */
  lift: Group
  rock: Object3D
  sculpture: Object3D
  summit: SummitRig
  glow: MeshStandardMaterial[]
  /** Intensité émissive du B allumé. */
  glowPeak: number
  dispose: () => void
}

/** Intensité émissive du B allumé : forte sous bloom, plafonnée à 1 sans. */
const SCULPT_GLOW = { bloom: 4.2, flat: 1 }
/** Amplitude de la vibration de la masse pendant la montée (m). */
const TREMOR = 2.4

/** Hauteur de la pointe du modèle (haut des coques), pour le ramener à MOUNTAIN.height. */
function modelScale(nodes: MajesticNodes): number {
  const box = new Box3().setFromObject(nodes.get('Mountain'))
  box.union(new Box3().setFromObject(nodes.get('Summit_Shell_L')))
  const top = box.max.y
  return top > 1 && Math.abs(top - MOUNTAIN.height) / MOUNTAIN.height > 0.05
    ? MOUNTAIN.height / top
    : 1
}

export function buildMountain(nodes: MajesticNodes, bloom: boolean): MountainRig {
  const owned: { dispose: () => void }[] = []
  const rock = cloneNode(nodes.get('Mountain'), owned, bloom)
  const sculpture = cloneNode(nodes.get('Mountain_B'), owned, bloom)
  const glow = materialsNamed(sculpture, (name) => name.startsWith('MountainB'))
  glow.forEach((material) => {
    material.toneMapped = !bloom
    material.emissiveIntensity = 0
  })
  const summit = buildSummit(nodes, bloom)
  const scaled = new Group()
  scaled.scale.setScalar(modelScale(nodes))
  scaled.add(rock, sculpture, summit.root)
  const lift = new Group()
  lift.rotation.y = MOUNTAIN.yaw
  lift.add(scaled)
  const root = new Group()
  root.add(lift)
  return {
    root,
    lift,
    rock,
    sculpture,
    summit,
    glow,
    glowPeak: bloom ? SCULPT_GLOW.bloom : SCULPT_GLOW.flat,
    dispose: () => {
      summit.dispose()
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Bruit lisse (somme de sinus), sans aléatoire par frame. */
const wobble = (x: number) =>
  Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 4.2) * 0.1

export function updateMountain(rig: MountainRig, m: MajesticState, time: number): void {
  const g = rig.lift
  g.visible = m.rise > 0.0005
  if (!g.visible) return
  const rising = m.rise > 0 && m.rise < 1 ? 1 : 0.25
  const amp = m.reduced ? 0 : TREMOR * m.quake * rising
  const [x, , z] = MOUNTAIN.position
  g.position.set(
    x + amp * wobble(time * 11),
    -MOUNTAIN.sunk * (1 - m.rise) + 0.5 * amp * wobble(time * 13 + 2),
    z + amp * wobble(time * 9 + 4),
  )
  g.rotation.z = amp * 0.00035 * wobble(time * 6 + 1)
  for (const material of rig.glow) material.emissiveIntensity = rig.glowPeak * m.sculpt
  updateSummit(rig.summit, m, time)
}
