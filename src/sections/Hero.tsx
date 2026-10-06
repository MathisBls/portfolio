// Hero (docs/storyboards/hero.md) : DOM du pin de 200 %. Le h1 est l'élément LCP, visible dès le HTML.
// La timeline GSAP écrit le progress 'hero' (lu par la scène) et efface le DOM aux fenêtres de lib/hero.ts.
import { Fragment, useLayoutEffect, useRef } from 'react'
import { identity } from '../content/services'
import { site } from '../content/site'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { CAPTIONS, CAPTION_FADE, HERO, wordWindow } from '../lib/hero'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { registerAnchor, setProgress } from '../scene/store'
import { Button } from '../ui/Button'
import { HeroPoster } from './HeroPoster'
import styles from './Hero.module.css'

export function Hero() {
  const { id } = site.sections.hero
  const { availability, ctaPrimary, ctaSecondary, scrollHint, captions } = site.hero
  // Garde prefersReducedMotion : useReducedMotion vaut false pendant l'hydratation (snapshot serveur)
  const reducedMotion = useReducedMotion() || prefersReducedMotion()
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
  // Reduced-motion : ni pin ni scrub. La scène reste à l'état initial (prisme seul, sans rayons) tant
  // que le hero est visible, pour que rien ne passe derrière le texte, puis saute à l'état final quand
  // on le quitte (review Phase 1, bloquant a11y).
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (reducedMotion) {
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        onLeave: () => {
          setProgress('hero', 1)
        },
        onEnterBack: () => {
          setProgress('hero', 0)
        },
      })
      setProgress('hero', trigger.progress >= 1 ? 1 : 0)
      return () => {
        trigger.kill()
      }
    }

    const ctx = gsap.context(() => {
      const intro = section.querySelectorAll<HTMLElement>('[data-intro]')
      const role = section.querySelectorAll<HTMLElement>('[data-role]')
      const wordEls = section.querySelectorAll<HTMLElement>('[data-word]')
      const captionEls = section.querySelectorAll<HTMLElement>('[data-caption]')

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
        // Opacité seule : pas de flou animé (repaint de mots de 144 px sur mobile) ni de décalage y
        // (HeroTitle3D mesure les spans : un y non nul décalerait le titre 3D au resize)
        tl.to(el, { opacity: 0, duration: end - start }, start)
      })
      // Captions (story-v2) : une phrase par étape, qui monte puis s'efface dans sa fenêtre
      captionEls.forEach((el, i) => {
        const w = CAPTIONS[i]
        if (!w) return
        const [a, b] = w
        tl.fromTo(
          el,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: CAPTION_FADE, immediateRender: false },
          a,
        )
        tl.to(el, { opacity: 0, y: -16, duration: CAPTION_FADE }, b - CAPTION_FADE)
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

      {/* Récit du pin (story-v2) : visibles une à une au scroll ; lues dans l'ordre par les lecteurs
          d'écran ; sans animation (sans JS, reduced-motion), elles restent dans le DOM mais hors écran */}
      <ol className={styles.captions}>
        {captions.map((caption) => (
          <li key={caption} className={styles.caption} data-caption>
            {caption}
          </li>
        ))}
      </ol>

      <p className={styles.hint} data-intro>
        {scrollHint}
      </p>
    </section>
  )
}
