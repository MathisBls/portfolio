// Bandeau décoratif entre Projets et Services. Il ne défile qu'avec le scroll (ScrollTrigger scrub, jamais de
// boucle autonome) : xPercent 0 -> -50 sur le passage dans la fenêtre, sens inversé en remontant. Le contenu
// est dupliqué une fois, donc -50 % retombe pile sur le départ. Les deux copies ont un nombre pair
// d'éléments (alternance contour / plein continue à la jonction). aria-hidden : les services existent
// déjà en texte dans la section suivante. Reduced-motion : statique.
import { useLayoutEffect, useRef } from 'react'
import { useContent } from '../content/useContent'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import styles from './Marquee.module.css'

export function Marquee() {
  const { text, services } = useContent()
  const items = [...services.map((service) => service.title), ...text.marquee]
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track || reduced) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        track,
        { xPercent: 0 },
        {
          xPercent: -50,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    }, root)
    return () => {
      ctx.revert()
    }
  }, [reduced])

  return (
    <div ref={rootRef} className={styles.marquee} aria-hidden="true">
      <div ref={trackRef} className={styles.track}>
        {[0, 1].map((copy) => (
          <ul key={copy} className={styles.group}>
            {items.map((item, i) => (
              <li key={item} className={styles.item} data-outline={i % 2 === 1 ? '' : undefined}>
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
