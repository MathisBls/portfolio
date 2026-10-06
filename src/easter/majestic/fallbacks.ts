// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Contrats », nœuds de
// majestic.glb) : remplacements construits en code, utilisés tant que majestic.glb (agent B2) n'est pas
// livré ou s'il lui manque un nœud. Mêmes noms, mêmes conventions et mêmes dimensions que le contrat :
// mètres, Mountain base à y = 0 (≈ 1200 m), Mountain_B sur la face +Z, Choir_Statue ≈ 80 m origine au
// pied face +Z avec son enfant Choir_Glow, Summit_Prism origine à sa base, Summit_Shell_L/R autour de lui.
// Les nœuds du sommet sont posés à leur place (repère de la montagne), comme dans le GLB.
import {
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
  BoxGeometry,
  type BufferGeometry,
} from 'three'
import { MOUNTAIN, SUMMIT } from './layout'

type Owned = { dispose: () => void }

export type Fallbacks = { nodes: Partial<Record<string, Object3D>>; dispose: () => void }

function mesh(name: string, geometry: BufferGeometry, material: Material, owned: Owned[]): Mesh {
  const m = new Mesh(geometry, material)
  m.name = name
  owned.push(geometry, material)
  return m
}

/** Bruit de valeur lisse et déterministe (sommes de sinus), pour les arêtes de la montagne. */
const ridge = (a: number, y: number) =>
  Math.sin(a * 7 + y * 0.004) * 0.6 +
  Math.sin(a * 13 + 1.7 + y * 0.009) * 0.3 +
  Math.sin(a * 29 + 4) * 0.1

/** Montagne : cône à arêtes, base à y = 0, sommet tronqué sous les coques. */
function mountain(owned: Owned[]): Mesh {
  const { height, radius } = MOUNTAIN
  const top = SUMMIT.position[1]
  const geometry = new CylinderGeometry(radius * (1 - top / height), radius, top, 128, 40, true)
  geometry.translate(0, top / 2, 0)
  const position = geometry.getAttribute('position')
  if (position instanceof BufferAttribute) {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      const a = Math.atan2(x, z)
      const r = Math.hypot(x, z)
      const k = 1 + 0.12 * ridge(a, y) * (1 - y / height)
      position.setXYZ(i, (x / (r || 1)) * r * k, y, (z / (r || 1)) * r * k)
    }
  }
  geometry.computeVertexNormals()
  const rock = new MeshStandardMaterial({ color: '#3b302d', roughness: 0.95, flatShading: true })
  rock.name = 'MountainRock'
  return mesh('Mountain', geometry, rock, owned)
}

/** B sculpté : fût et deux panses, posés sur la face +Z, inclinés comme la pente. */
function sculpture(owned: Owned[]): Group {
  const root = new Group()
  root.name = 'Mountain_B'
  const material = new MeshStandardMaterial({
    color: '#2a2224',
    roughness: 0.8,
    emissive: '#ff4fa8',
    emissiveIntensity: 0,
  })
  material.name = 'MountainB'
  const stem = mesh('Mountain_B_Stem', new BoxGeometry(40, 260, 30), material, owned)
  stem.position.set(-60, 0, 0)
  const bowl = (y: number, r: number) => {
    const half = mesh('Mountain_B_Bowl', new TorusGeometry(r, 20, 10, 32, Math.PI), material, owned)
    half.rotation.z = -Math.PI / 2
    half.position.set(-60, y, 0)
    return half
  }
  root.add(stem, bowl(65, 62), bowl(-62, 68))
  const { height, radius } = MOUNTAIN
  const y = 545
  const slope = Math.atan2(radius, height)
  root.position.set(0, y, radius * (1 - y / height) + 12)
  root.rotation.x = -(Math.PI / 2 - slope) * 0.55
  return root
}

/** Colosse encapuchonné (≈ 80 m) : robe, capuche, bras levés ; lueur du visage et des mains. */
function statue(owned: Owned[]): Group {
  const root = new Group()
  root.name = 'Choir_Statue'
  const stone = new MeshStandardMaterial({ color: '#5b5450', roughness: 0.9, flatShading: true })
  stone.name = 'ChoirStone'
  const robe = mesh('Choir_Robe', new ConeGeometry(15, 62, 12), stone, owned)
  robe.position.y = 31
  const hood = mesh('Choir_Hood', new ConeGeometry(9, 22, 12), stone, owned)
  hood.position.y = 70
  const arms = mesh('Choir_Arms', new CylinderGeometry(2.6, 3.2, 34, 8), stone, owned)
  arms.position.set(0, 58, 6)
  arms.rotation.x = 0.5
  const glowMaterial = new MeshStandardMaterial({
    color: '#000000',
    emissive: '#ffd9a0',
    emissiveIntensity: 1,
  })
  glowMaterial.name = 'ChoirGlow'
  const glow = new Group()
  glow.name = 'Choir_Glow'
  const face = mesh('Choir_Glow_Face', new SphereGeometry(3.6, 12, 8), glowMaterial, owned)
  face.position.set(0, 66, 4.5)
  const hands = mesh('Choir_Glow_Hands', new SphereGeometry(3, 10, 6), glowMaterial, owned)
  hands.position.set(0, 73, 14)
  glow.add(face, hands)
  root.add(robe, hood, arms, glow)
  return root
}

/** Prisme du sommet (prisme triangulaire droit), origine à sa base. */
function prism(owned: Owned[]): Mesh {
  const geometry = new CylinderGeometry(40, 40, SUMMIT.prismHeight, 3, 1)
  geometry.translate(0, SUMMIT.prismHeight / 2, 0)
  const glass = new MeshPhysicalMaterial({ color: '#dfe6f5', roughness: 0.1, transparent: true })
  glass.name = 'SummitGlass'
  const node = mesh('Summit_Prism', geometry, glass, owned)
  node.position.set(...SUMMIT.position)
  return node
}

/**
 * Coques du sommet : les deux moitiés (x < 0 et x > 0) de la pointe, du plateau au sommet, origine à la
 * charnière extérieure (x = ∓ rayon du plateau, y du plateau), comme dans le GLB.
 */
function shells(owned: Owned[]): Mesh[] {
  const rock = new MeshStandardMaterial({ color: '#3b302d', roughness: 0.95, flatShading: true })
  rock.name = 'MountainRock'
  owned.push(rock)
  const base = SUMMIT.position[1]
  const tall = MOUNTAIN.height - base
  const radius = MOUNTAIN.radius * (tall / MOUNTAIN.height)
  return (['L', 'R'] as const).map((side) => {
    const sign = side === 'L' ? -1 : 1
    const geometry = new ConeGeometry(
      radius,
      tall,
      24,
      4,
      false,
      side === 'L' ? Math.PI : 0,
      Math.PI,
    )
    geometry.translate(-sign * radius, tall / 2, 0)
    owned.push(geometry)
    const node = new Mesh(geometry, rock)
    node.name = `Summit_Shell_${side}`
    node.position.set(sign * radius, base, 0)
    return node
  })
}

export function buildFallbacks(): Fallbacks {
  const owned: Owned[] = []
  const [shellL, shellR] = shells(owned)
  const nodes: Partial<Record<string, Object3D>> = {
    Mountain: mountain(owned),
    Mountain_B: sculpture(owned),
    Choir_Statue: statue(owned),
    Summit_Prism: prism(owned),
    Summit_Shell_L: shellL,
    Summit_Shell_R: shellR,
  }
  return {
    nodes,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}
