// Easter egg v3, beat 8 (« Références BoulardTV partout ») : enseignes néon et visuels d'attente des
// écrans, dessinés en canvas 2D (aucune image à télécharger). Le mot vient de site.easter.hud.name
// (agent A). Néon : trois passes (halo large, halo serré, cœur clair) sur fond transparent, à poser en
// additif ; sous bloom, la couleur du matériau dépasse 1 et seul le néon fleurit.
import { AdditiveBlending, CanvasTexture, Color, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { site } from '../../content/site'

export const BRAND = site.easter.hud.name

const FONT = '"Inter Variable", "Arial Black", Arial, sans-serif'

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function toTexture(c: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Texte néon (rapport largeur/hauteur 4:1), couleur du tube et de son halo. */
export function neonTexture(text: string, tube: string, halo: string): CanvasTexture {
  const w = 1024
  const h = 256
  const [c, ctx] = canvas(w, h)
  if (!ctx) return toTexture(c)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 150
  ctx.font = `800 ${String(size)}px ${FONT}`
  const width = ctx.measureText(text).width
  if (width > w * 0.86) size = Math.floor((size * w * 0.86) / width)
  ctx.font = `800 ${String(size)}px ${FONT}`
  const passes: readonly (readonly [string, number, number])[] = [
    [halo, 46, 0.9],
    [halo, 18, 1],
    [tube, 6, 1],
  ]
  for (const [color, blur, alpha] of passes) {
    ctx.shadowColor = color
    ctx.shadowBlur = blur
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.fillText(text, w / 2, h / 2)
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.strokeText(text, w / 2, h / 2)
  return toTexture(c)
}

/** Matériau additif d'une enseigne : `gain` > 1 sous bloom pour que le néon fleurisse. */
export function neonMaterial(texture: CanvasTexture, gain: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: texture,
    color: new Color(1, 1, 1).multiplyScalar(gain),
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
}

/** Visuels d'attente des écrans (16:9) tant que SCREENS n'est pas chargé : marque, « LIVE », dégradé. */
export function placeholderScreen(variant: number): CanvasTexture {
  const w = 640
  const h = 360
  const [c, ctx] = canvas(w, h)
  if (!ctx) return toTexture(c)
  const tones = [
    ['#2a0a2e', '#ff3d8b'],
    ['#0b1430', '#59e1ff'],
    ['#2b1305', '#ffb347'],
  ] as const
  const [bg, accent] = tones[variant % tones.length] ?? tones[0]
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.7)
  g.addColorStop(0, accent)
  g.addColorStop(0.35, bg)
  g.addColorStop(1, '#05030a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 64px ${FONT}`
  ctx.fillText(BRAND, w / 2, h / 2)
  ctx.fillStyle = accent
  ctx.fillRect(28, 26, 92, 34)
  ctx.fillStyle = '#05030a'
  ctx.font = `800 22px ${FONT}`
  ctx.fillText('LIVE', 74, 44)
  return toTexture(c)
}
