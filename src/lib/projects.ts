// Logique pure de la section Projets (docs/storyboards/projects.md), testée dans projects.test.ts.

/** Couleurs émissives des rayons Spec0..6 de prism.glb (docs/models.md). */
export const RAY_COLORS = [
  '#ff0000',
  '#ff8000',
  '#ffff00',
  '#00ff00',
  '#0099ff',
  '#4d00ff',
  '#bf00ff',
] as const

/** Teinte (0..360) d'une couleur #rrggbb. */
export function hue(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

/**
 * Attribue à chaque accent de projet un rayon distinct, en minimisant la somme des écarts de teinte
 * (recherche exhaustive : 7 rayons, 5 projets = 2 520 cas). Renvoie l'indice du rayon par projet.
 */
export function assignRays(accents: readonly string[], rays: readonly string[] = RAY_COLORS) {
  const accentHues = accents.map(hue)
  const rayHues = rays.map(hue)
  let best: number[] = []
  let bestCost = Infinity
  const used = new Array<boolean>(rays.length).fill(false)
  const current: number[] = []
  const search = (i: number, cost: number) => {
    if (cost >= bestCost) return
    if (i === accentHues.length) {
      best = [...current]
      bestCost = cost
      return
    }
    for (let r = 0; r < rayHues.length; r++) {
      if (used[r]) continue
      used[r] = true
      current.push(r)
      search(i + 1, cost + hueDistance(accentHues[i] ?? 0, rayHues[r] ?? 0))
      current.pop()
      used[r] = false
    }
  }
  search(0, 0)
  return best
}

/**
 * Mesures d'un emplacement visuel de projet (px, viewport), relevées par le DOM à chaque mise à jour
 * de son ScrollTrigger (scroll) et au refresh. `top` est la position live : les chapitres sont
 * collants (sticky), la position n'est plus une fonction linéaire du progress.
 */
export type SlotMetrics = {
  left: number
  top: number
  width: number
  height: number
  viewportH: number
}

/** Centre vertical (px, depuis le haut du viewport) de l'emplacement, à la dernière mesure. */
export function slotCenter(m: SlotMetrics): number {
  return m.top + m.height / 2
}

/** Projet actif = celui dont l'emplacement est le plus proche du centre de l'écran (p le plus proche de 0.5). */
export function activeIndex(progresses: readonly number[]): number {
  let best = -1
  let bestDist = Infinity
  progresses.forEach((p, i) => {
    if (p <= 0 || p >= 1) return
    const d = Math.abs(p - 0.5)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}
