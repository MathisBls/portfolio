// Easter egg v3, beats 4 à 8 (docs/storyboards/easter-park.md : « Sur le HUD, un radar dont le point se
// rapproche ») : dessin des trois écrans du cockpit de l'Explorer dans des canvas 2D (CanvasTexture sur
// Cockpit_ScreenL/C/R, Cockpit.tsx), sans React. Redessinés quelques fois par seconde seulement.
// - Gauche : vaisseau, liaison radio avec Houston (barres qui bougent quand il parle), vitesse.
// - Centre : radar, balayage lent (un tour en 4 s), le point de la cible qui se rapproche du centre.
// - Droite : distance de la cible qui décroît, identité « inconnue » puis le nom, verrouillé.
// Libellés : site.easter.hud. Aucun clignotement : le point respire à 0.5 Hz, rien ne s'allume d'un coup.
import { site } from '../../content/site'

const HUD = site.easter.hud
const CYAN = '127, 233, 255'
const PINK = '255, 95, 168'
const FONT = '"JetBrains Mono", ui-monospace, monospace'

export type HudData = {
  /** Secondes (balayage, respiration du point). */
  time: number
  /** Allumage des écrans 0 -> 1 (sortie du warp). */
  power: number
  /** Distance de la cible (km) et position sur le radar (0 au centre, 1 au bord). */
  distance: number
  range: number
  /** Direction de la cible sur le radar (radians, 0 en haut, sens horaire). */
  bearing: number
  /** Houston parle (sous-titre affiché). */
  speaking: boolean
  /** Cible identifiée (la porte s'allume) 0 -> 1. */
  identified: number
  /** Vitesse affichée (km/s). */
  velocity: number
  /** Reduced-motion : balayage figé, barres immobiles. */
  still: boolean
}

export function createHudData(): HudData {
  return {
    time: 0,
    power: 0,
    distance: 0,
    range: 1,
    bearing: 0.3,
    speaking: false,
    identified: 0,
    velocity: 0,
    still: false,
  }
}

const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${a.toFixed(3)})`

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, power: number) {
  ctx.fillStyle = '#03060a'
  ctx.fillRect(0, 0, w, h)
  // Lueur de l'écran et cadre fin
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
  glow.addColorStop(0, rgba(CYAN, 0.08 * power))
  glow.addColorStop(1, rgba(CYAN, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = rgba(CYAN, 0.35 * power)
  ctx.lineWidth = Math.max(1, h * 0.008)
  ctx.strokeRect(h * 0.03, h * 0.03, w - h * 0.06, h - h * 0.06)
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = `600 ${size.toFixed(0)}px ${FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/** Écran central : radar. */
export function drawRadar(ctx: CanvasRenderingContext2D, w: number, h: number, d: HudData) {
  const p = d.power
  frame(ctx, w, h, p)
  if (p <= 0.01) return
  const cx = w / 2
  const cy = h * 0.54
  const r = Math.min(w, h) * 0.4
  ctx.lineWidth = Math.max(1, h * 0.006)
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = rgba(CYAN, 0.28 * p)
    ctx.beginPath()
    ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx, cy + r)
  ctx.stroke()
  // Balayage : un secteur dégradé qui tourne lentement
  const sweep = d.still ? -Math.PI / 2 : (d.time * Math.PI) / 2 - Math.PI / 2
  for (let i = 0; i < 12; i++) {
    const a0 = sweep - (i + 1) * 0.07
    ctx.fillStyle = rgba(CYAN, 0.16 * p * (1 - i / 12))
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, a0, a0 + 0.07)
    ctx.closePath()
    ctx.fill()
  }
  // La cible : un point rose qui respire, de plus en plus près du centre
  const tr = r * Math.min(1, d.range)
  const tx = cx + Math.sin(d.bearing) * tr
  const ty = cy - Math.cos(d.bearing) * tr
  const breathe = d.still ? 1 : 0.8 + 0.2 * Math.sin(d.time * Math.PI)
  const dot = h * (0.018 + 0.012 * d.identified)
  const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, dot * 4)
  halo.addColorStop(0, rgba(PINK, 0.55 * p * breathe))
  halo.addColorStop(1, rgba(PINK, 0))
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(tx, ty, dot * 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(PINK, p)
  ctx.beginPath()
  ctx.arc(tx, ty, dot, 0, Math.PI * 2)
  ctx.fill()
  const size = h * 0.07
  label(ctx, HUD.radar, h * 0.08, h * 0.1, size, rgba(CYAN, 0.8 * p))
  label(ctx, HUD.signal, w - h * 0.08, h * 0.1, size, rgba(PINK, 0.9 * p), 'right')
}

/** Écran gauche : vaisseau, liaison radio, vitesse. */
export function drawComms(ctx: CanvasRenderingContext2D, w: number, h: number, d: HudData) {
  const p = d.power
  frame(ctx, w, h, p)
  if (p <= 0.01) return
  const size = Math.min(h * 0.085, w * 0.06)
  const x = w * 0.13
  label(ctx, HUD.ship, x, h * 0.17, size * 1.15, rgba(CYAN, 0.95 * p))
  label(ctx, HUD.comms, x, h * 0.32, size * 0.8, rgba(CYAN, 0.6 * p))
  // Barres de la voix : immobiles et basses quand Houston se tait
  const bars = 16
  const bw = (w - 2 * x) / bars
  for (let i = 0; i < bars; i++) {
    const wave = d.still
      ? 0.35
      : 0.5 + 0.5 * Math.sin(d.time * 7.3 + i * 1.7) * Math.sin(d.time * 3.1 + i * 0.6)
    const level = d.speaking ? 0.15 + 0.85 * wave : 0.06
    const bh = h * 0.24 * level
    ctx.fillStyle = rgba(CYAN, (0.35 + 0.5 * level) * p)
    ctx.fillRect(x + i * bw + bw * 0.2, h * 0.58 - bh / 2, bw * 0.6, bh)
  }
  label(ctx, HUD.velocity, x, h * 0.8, size * 0.8, rgba(CYAN, 0.6 * p))
  label(ctx, `${formatNumber(d.velocity)} km/s`, w - x, h * 0.8, size, rgba(CYAN, 0.95 * p), 'right')
}

/** Écran droit : distance, identité. */
export function drawTarget(ctx: CanvasRenderingContext2D, w: number, h: number, d: HudData) {
  const p = d.power
  frame(ctx, w, h, p)
  if (p <= 0.01) return
  const size = Math.min(h * 0.085, w * 0.06)
  const x = w * 0.13
  label(ctx, HUD.distance, x, h * 0.18, size * 0.8, rgba(CYAN, 0.6 * p))
  label(ctx, `${formatNumber(d.distance)} km`, x, h * 0.36, size * 1.3, rgba(CYAN, 0.95 * p))
  label(ctx, HUD.identity, x, h * 0.58, size * 0.8, rgba(CYAN, 0.6 * p))
  // Inconnue, puis le nom qui monte en fondu (rampe, pas de clignotement)
  const known = d.identified
  label(ctx, HUD.unknown, x, h * 0.76, size * 1.15, rgba(PINK, (1 - known) * 0.9 * p))
  label(ctx, HUD.name, x, h * 0.76, size * 1.15, rgba(PINK, known * p))
  label(ctx, HUD.locked, w - x, h * 0.76, size * 0.7, rgba(PINK, known * 0.8 * p), 'right')
}

/** Nombre entier avec espaces fines comme séparateurs de milliers (lisible de loin). */
export function formatNumber(value: number): string {
  const n = Math.max(0, Math.round(value))
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
