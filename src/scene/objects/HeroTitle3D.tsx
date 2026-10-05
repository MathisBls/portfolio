// Storyboard hero (docs/storyboards/hero.md §2) : p 0.0 « Titre 3D (2 mots) derrière le prisme,
// réfracté par le verre », p 0.5-0.6 « Le mot 1 commence à se dissoudre (bords lumineux) » puis « Mot 2
// se dissout » (wordT). §4 : ancre 'hero-title', drapeau has-3d-title. §6 risque 3 : recalcul au resize.
// Un plan par <span data-word> du h1, texte rasterisé dans la police calculée du span, placé pour que
// sa projection par la caméra de la clé 0 de CAMERA_PATH recouvre exactement le span (section épinglée
// en haut de l'écran). Desktop seulement, jamais en reduced-motion.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, Color, LinearFilter, type Mesh, PerspectiveCamera, Vector2 } from 'three'
import { ScrollTrigger } from '../../lib/gsap'
import { wordT } from '../../lib/hero'
import { CAMERA_PATH } from '../cameraPath'
import { useAnchor } from '../hooks'
import { DissolveMaterial } from '../materials/dissolve'
import { getProgress, setSceneFlag } from '../store'

/** Derrière le prisme : sa face visible la plus profonde est vers z = −1 (tilt compris). */
const Z_TITLE = -1.5
const RESIZE_DEBOUNCE = 150
/** Marge autour du span (en em) : jambages, italique, débords des glyphes. */
const PAD_EM = 0.3

type Word = { texture: CanvasTexture; position: [number, number, number]; size: [number, number] }
type View = { width: number; height: number; fov: number }
type Built = { anchor: HTMLElement; color: string; words: Word[] }

const fontOf = (s: CSSStyleDeclaration) =>
  `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`

function textOf(span: HTMLElement, s: CSSStyleDeclaration) {
  const text = span.textContent.trim()
  if (s.textTransform === 'uppercase') return text.toLocaleUpperCase('fr')
  if (s.textTransform === 'lowercase') return text.toLocaleLowerCase('fr')
  return text
}

/** Rasterise le span (blanc, seul l'alpha sert) et le projette sur le plan z = Z_TITLE. */
function rasterize(span: HTMLElement, sectionTop: number, view: View): Word | null {
  const key = CAMERA_PATH[0]
  const style = getComputedStyle(span)
  // Boîte du texte lui-même (le span peut être en display: block, plus large que ses glyphes)
  const range = document.createRange()
  range.selectNodeContents(span)
  const rect = range.getBoundingClientRect()
  const ctx = document.createElement('canvas').getContext('2d')
  if (!key || !ctx || rect.width === 0) return null

  const dpr = window.devicePixelRatio || 1
  const pad = Math.ceil(parseFloat(style.fontSize) * PAD_EM)
  const { canvas } = ctx
  canvas.width = Math.ceil((rect.width + 2 * pad) * dpr)
  canvas.height = Math.ceil((rect.height + 2 * pad) * dpr)
  ctx.scale(dpr, dpr)
  ctx.font = fontOf(style)
  if (style.letterSpacing !== 'normal') ctx.letterSpacing = style.letterSpacing
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  const text = textOf(span, style)
  const m = ctx.measureText(text)
  // Boîte du texte = zone de contenu de la police (ascent + descent) : ligne de base au même endroit
  const baseline = pad + rect.height / 2 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2
  ctx.fillText(text, pad, baseline)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false

  // Projection inverse pour la caméra de la clé 0 (regard selon −Z) : px CSS → unités monde à Z_TITLE
  const [camX, camY, camZ] = key.position
  const unit = (2 * (camZ - Z_TITLE) * Math.tan((view.fov * Math.PI) / 360)) / view.height
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const cx = rect.left - pad + w / 2
  const cy = rect.top - sectionTop - pad + h / 2
  return {
    texture,
    position: [camX + (cx - view.width / 2) * unit, camY + (view.height / 2 - cy) * unit, Z_TITLE],
    size: [w * unit, h * unit],
  }
}

async function buildWords(anchor: HTMLElement, view: View): Promise<Built> {
  const spans = Array.from(anchor.querySelectorAll<HTMLElement>('[data-word]'))
  await Promise.all(
    spans.map((span) => {
      const style = getComputedStyle(span)
      return document.fonts.load(fontOf(style), textOf(span, style)).catch(() => [])
    }),
  )
  // Mesures synchrones, après chargement : rect relatif au haut de la section (épinglée en haut)
  const sectionTop = (anchor.closest('section') ?? anchor).getBoundingClientRect().top
  const color = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()
  const words = spans.flatMap((span) => rasterize(span, sectionTop, view) ?? [])
  return { anchor, color: color || '#ededf0', words }
}

const NONE: readonly Word[] = []

export function HeroTitle3D({ reducedMotion }: { reducedMotion: boolean }) {
  const anchor = useAnchor('hero-title')
  const get = useThree((s) => s.get)
  const invalidate = useThree((s) => s.invalidate)
  const [built, setBuilt] = useState<Built | null>(null)
  const meshes = useRef<(Mesh | null)[]>([])

  useEffect(() => {
    if (reducedMotion || !anchor) return
    let version = 0
    let timer = 0
    const build = () => {
      const v = ++version
      const { size, camera } = get()
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 35
      void buildWords(anchor, { width: size.width, height: size.height, fov }).then((next) => {
        if (v === version) setBuilt(next)
        else
          next.words.forEach((w) => {
            w.texture.dispose()
          })
      })
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(build, RESIZE_DEBOUNCE)
    }
    build()
    window.addEventListener('resize', schedule)
    ScrollTrigger.addEventListener('refresh', schedule)
    return () => {
      version++
      window.clearTimeout(timer)
      window.removeEventListener('resize', schedule)
      ScrollTrigger.removeEventListener('refresh', schedule)
    }
  }, [anchor, reducedMotion, get])

  const current = !reducedMotion && built?.anchor === anchor ? built : null
  const words = current?.words ?? NONE
  const planes = useMemo(() => {
    const color = new Color(current?.color ?? '#ededf0')
    return words.map((w, i) => ({
      ...w,
      material: new DissolveMaterial(w.texture, color, new Vector2(...w.size), i * 7.31),
    }))
  }, [words, current?.color])

  useEffect(
    () => () => {
      planes.forEach((plane) => {
        plane.material.dispose()
        plane.texture.dispose()
      })
    },
    [planes],
  )

  // Plans prêts : les spans DOM passent à opacity 0 (CSS de Hero)
  const ready = planes.length > 0
  useEffect(() => {
    if (!ready) return
    setSceneFlag('has-3d-title', true)
    invalidate()
    return () => {
      setSceneFlag('has-3d-title', false)
    }
  }, [ready, invalidate])

  useFrame(() => {
    const p = getProgress('hero')
    const n = planes.length
    for (let i = 0; i < n; i++) {
      const mesh = meshes.current[i]
      if (!mesh || !(mesh.material instanceof DissolveMaterial)) continue
      const t = wordT(p, i, n)
      mesh.material.uniforms.uProgress.value = t
      mesh.visible = t < 1
    }
  })

  return (
    <group>
      {planes.map((plane, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          position={plane.position}
          scale={[plane.size[0], plane.size[1], 1]}
          material={plane.material}
        >
          <planeGeometry />
        </mesh>
      ))}
    </group>
  )
}
