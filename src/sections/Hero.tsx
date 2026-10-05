// Hero (docs/storyboards/hero.md) : DOM du pin de 200 %. Le h1 est l'élément LCP, visible dès le HTML.
// La timeline GSAP écrit le progress 'hero' (lu par la scène) et efface le DOM aux fenêtres de lib/hero.ts.
import { Fragment, useLayoutEffect, useRef } from 'react'
import { identity } from '../content/services'
import { site } from '../content/site'
import { gsap } from '../lib/gsap'
import { HERO, wordWindow } from '../lib/hero'
import { useReducedMotion } from '../lib/useReducedMotion'
import { registerAnchor, setProgress } from '../scene/store'
import { Button } from '../ui/Button'
import styles from './Hero.module.css'

// Poster sans WebGL : prisme en trait, faisceau blanc par la gauche, 7 rayons (Spec0 rouge en bas,
// Spec6 violet en haut) qui sortent par la face droite, éventail de +/-18 degrés. Coordonnées en dur
// (même rendu serveur et navigateur, pas de trigonométrie à l'hydratation).
const RAY_ORIGIN = [554, 263.5] as const
const RAY_ENDS = [
  [982, 402.6],
  [994.2, 357.1],
  [1001.5, 310.5],
  [1004, 263.5],
  [1001.5, 216.5],
  [994.2, 169.9],
  [982, 124.4],
] as const

function HeroPoster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      <svg viewBox="0 -36.5 1000 600" focusable="false">
        <defs>
          <linearGradient
            id="hero-beam"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="446"
            y2="0"
          >
            <stop offset="0" stopColor="#ededf0" stopOpacity="0" />
            <stop offset="1" stopColor="#ededf0" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id="hero-fade"
            gradientUnits="userSpaceOnUse"
            x1="554"
            y1="0"
            x2="1000"
            y2="0"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
          <mask id="hero-rays" maskUnits="userSpaceOnUse" x="0" y="-100" width="1000" height="800">
            <rect y="-100" width="1000" height="800" fill="url(#hero-fade)" />
          </mask>
        </defs>
        <line
          x1="0"
          y1="263.5"
          x2="446"
          y2="263.5"
          stroke="url(#hero-beam)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="446"
          y1="263.5"
          x2="554"
          y2="263.5"
          stroke="#ededf0"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <path
          d="M500 170 L608 357 L392 357 Z"
          fill="rgba(237, 237, 240, 0.03)"
          stroke="var(--fg-2)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <g mask="url(#hero-rays)" strokeWidth="3" strokeLinecap="round">
          {RAY_ENDS.map(([x, y], i) => (
            <line
              key={i}
              x1={RAY_ORIGIN[0]}
              y1={RAY_ORIGIN[1]}
              x2={x}
              y2={y}
              style={{ stroke: `var(--ray-${String(i)})` }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

export function Hero() {
  const { id } = site.sections.hero
  const { availability, ctaPrimary, ctaSecondary, scrollHint } = site.hero
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const words = identity.name.split(' ')

  // Ancre pour le titre 3D (la scène mesure les <span data-word>)
  useLayoutEffect(() => {
    const title = titleRef.current
    if (!title) return
    registerAnchor('hero-title', title)
    return () => {
      registerAnchor('hero-title', null)
    }
  }, [])

  // Pin + timeline de durée 1, positionnée sur les fenêtres de lib/hero.ts.
  // Reduced-motion : ni pin ni timeline, la scène affiche l'état final, le DOM reste lisible.
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (reducedMotion) {
      setProgress('hero', 1)
      return
    }

    const ctx = gsap.context(() => {
      const intro = section.querySelectorAll<HTMLElement>('[data-intro]')
      const role = section.querySelectorAll<HTMLElement>('[data-role]')
      const wordEls = section.querySelectorAll<HTMLElement>('[data-word]')

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'hero',
          trigger: section,
          start: 'top top',
          end: HERO.pinEnd,
          pin: true,
          scrub: 0.6,
        },
        onUpdate: () => {
          setProgress('hero', tl.progress())
        },
      })

      tl.to(intro, { opacity: 0, y: -12, duration: HERO.intro[1] - HERO.intro[0] }, HERO.intro[0])
      tl.to(role, { opacity: 0, y: -12, duration: HERO.role[1] - HERO.role[0] }, HERO.role[0])
      wordEls.forEach((el, i) => {
        const [start, end] = wordWindow(i, wordEls.length)
        tl.to(el, { opacity: 0, filter: 'blur(8px)', y: -20, duration: end - start }, start)
      })
      // Durée totale exactement 1 : le progress de la timeline est le progress 'hero'
      tl.set({}, {}, 1)
    }, section)

    return () => {
      ctx.revert()
    }
  }, [reducedMotion])

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.hero}>
      <HeroPoster />

      <div className={styles.center}>
        <h1 id={`${id}-titre`} ref={titleRef} className={styles.title}>
          {words.map((word, i) => (
            <Fragment key={`${word}-${String(i)}`}>
              {i > 0 && ' '}
              <span data-word className={styles.word}>
                {word}
              </span>
            </Fragment>
          ))}
        </h1>
        <p className={styles.role} data-role>
          {identity.role}
        </p>
        <p className={styles.badge} data-role>
          <span className={styles.dot} aria-hidden="true" />
          {availability}
        </p>
      </div>

      <div className={styles.bottom}>
        <p className={styles.pitch} data-intro>
          {identity.pitch}
        </p>
        <div className={styles.actions} data-intro>
          <Button href={ctaPrimary.href}>{ctaPrimary.label}</Button>
          <Button href={ctaSecondary.href} variant="ghost">
            {ctaSecondary.label}
          </Button>
        </div>
      </div>

      <p className={styles.hint} data-intro>
        {scrollHint}
      </p>
    </section>
  )
}
