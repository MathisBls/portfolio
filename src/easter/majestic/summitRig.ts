// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 6 « Le sommet s'ouvre sur
// un prisme de verre géant. Les faisceaux du chœur y convergent ») : le sommet, sans React. Les coques
// (Summit_Shell_L/R, origine à leur charnière extérieure) basculent vers l'extérieur avec M.prism, comme
// des pétales ; le prisme (Summit_Prism, origine à sa base) monte un peu et tourne lentement.
// Verre : celui du site sans transmission (scene/materials/PrismGlass.tsx, variante SolidGlass :
// physique, iridescence, vernis, reflets forts) à la place du verre à transmission du GLB (une passe de
// transmission à l'échelle de la plaine coûterait un rendu de plus par image) ; le verre s'illumine de
// l'intérieur quand les faisceaux convergent (M.beams × M.prism) et culmine avec le spectre (le halo
// autour du sommet est celui de D4, env/light.ts). Enfant du groupe de la montagne (mountainRig.ts) : il
// monte avec elle. Reduced-motion : prisme immobile.
import { Group, type Material, MeshPhysicalMaterial, type Object3D, type Vector3 } from 'three'
import { type MajesticNodes, cloneNode } from './model'
import type { MajesticState } from './state'

export type SummitRig = {
  root: Group
  shellL: Object3D
  shellR: Object3D
  prism: Object3D
  rest: Vector3
  glass: MeshPhysicalMaterial
  bloom: boolean
  dispose: () => void
}

/** Verre du site sans transmission (SolidGlass de PrismGlass.tsx), à l'échelle du sommet. */
function glass(bloom: boolean): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: '#cfd8ea',
    transparent: true,
    opacity: 0.62,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.75,
    iridescenceIOR: 1.3,
    envMapIntensity: 3,
    emissive: '#f4ecff',
    emissiveIntensity: 0,
    toneMapped: !bloom,
    depthWrite: false,
  })
}

/** Ouverture des coques : bascule (rad) de chaque moitié autour de sa charnière extérieure (axe Z). */
const OPEN = 1.15
/** Le prisme monte hors des coques (m) et se balance doucement (rad). */
const PRISM = { lift: 34, sway: 0.12 }

export function buildSummit(nodes: MajesticNodes, bloom: boolean): SummitRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  const shellL = cloneNode(nodes.get('Summit_Shell_L'), owned, bloom)
  const shellR = cloneNode(nodes.get('Summit_Shell_R'), owned, bloom)
  const material = glass(bloom)
  owned.push(material)
  const prism = cloneNode(nodes.get('Summit_Prism'), owned, bloom, (source: Material) => {
    source.dispose()
    return material
  })
  root.add(shellL, shellR, prism)
  return {
    root,
    shellL,
    shellR,
    prism,
    rest: prism.position.clone(),
    glass: material,
    bloom,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

export function updateSummit(rig: SummitRig, m: MajesticState, time: number): void {
  const open = m.prism
  const ease = open * open * (3 - 2 * open)
  // Les deux moitiés de la pointe basculent vers l'extérieur, comme des pétales
  rig.shellL.rotation.z = OPEN * ease
  rig.shellR.rotation.z = -OPEN * ease
  rig.prism.position.set(rig.rest.x, rig.rest.y + PRISM.lift * ease, rig.rest.z)
  // Léger balancement autour de sa face avant (+Z), d’où part le spectre (D4)
  if (!m.reduced) rig.prism.rotation.y = PRISM.sway * Math.sin(time * 0.21)
  // Cœur du prisme : les faisceaux y convergent, il culmine avec le spectre
  const light = Math.min(1, m.beams * (0.25 + 0.75 * open)) * 0.55 + 0.9 * m.spectrum
  rig.glass.emissiveIntensity = (rig.bloom ? 1.6 : 0.6) * light
}
