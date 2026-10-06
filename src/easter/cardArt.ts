// Easter egg, beat 3 : illustration des cartes. Le GLB n'a pas d'images (export sans textures) : la
// fenêtre d'illustration (*_art) sortait en gris uni. On y dessine le concept du site, en canvas 2D :
// un faisceau blanc entre dans un prisme, un spectre en sort, sur un fond aux couleurs de la rareté.
import { CanvasTexture, SRGBColorSpace } from 'three'
import { seeded } from './shaders'

export type Rarity = 'common' | 'rare' | 'legendary'

const PALETTE: Record<Rarity, { inner: string; outer: string; edge: string }> = {
  common: { inner: '#8d97ab', outer: '#161a24', edge: '#e6ebf5' },
  rare: { inner: '#3f7dff', outer: '#071331', edge: '#cfe0ff' },
  legendary: { inner: '#ffb347', outer: '#2f0f06', edge: '#fff1cf' },
}

/** Les 7 rayons du spectre (--ray-0..6, tokens.css). */
const SPECTRUM = ['#ff3b3b', '#ff9f1a', '#ffe14d', '#4cff6a', '#2aa7ff', '#6a4cff', '#b44cff']

export function createCardArt(rarity: Rarity): CanvasTexture {
  const w = 256
  const h = 320
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  if (!ctx) return texture
  const { inner, outer, edge } = PALETTE[rarity]

  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 8, w * 0.5, h * 0.5, h * 0.75)
  bg.addColorStop(0, inner)
  bg.addColorStop(1, outer)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const random = seeded(rarity.length * 31)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  for (let i = 0; i < 40; i++) {
    const r = random() * 1.3 + 0.3
    ctx.beginPath()
    ctx.arc(random() * w, random() * h, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const cx = w * 0.5
  const cy = h * 0.5
  const s = w * 0.2
  const apex = { x: cx, y: cy - s }
  const left = { x: cx - s * 0.95, y: cy + s * 0.65 }
  const right = { x: cx + s * 0.95, y: cy + s * 0.65 }
  // Spectre : du flanc droit du prisme vers le bord droit, en éventail
  ctx.lineCap = 'round'
  ctx.shadowBlur = 10
  SPECTRUM.forEach((color, i) => {
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.42, cy + s * 0.05)
    ctx.lineTo(w + 4, cy - s * 0.25 + i * s * 0.32)
    ctx.stroke()
  })
  // Faisceau blanc entrant par la gauche
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-4, cy + s * 0.55)
  ctx.lineTo(cx - s * 0.42, cy + s * 0.05)
  ctx.stroke()
  // Prisme
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.strokeStyle = edge
  ctx.shadowColor = edge
  ctx.shadowBlur = 16
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(apex.x, apex.y)
  ctx.lineTo(right.x, right.y)
  ctx.lineTo(left.x, left.y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  texture.needsUpdate = true
  return texture
}
